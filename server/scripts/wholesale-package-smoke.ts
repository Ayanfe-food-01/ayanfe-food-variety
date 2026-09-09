import { randomUUID } from 'node:crypto'
import { FulfillmentMethod, PaymentMethod, Prisma, ShoppingMode, UserRole } from '@prisma/client'
import { prisma, closeDatabase } from '../src/config/prisma.js'
import { HttpError } from '../src/utils/http.js'
import { addCustomerCartItem, updateCustomerCartItem } from '../src/modules/cart/cart.mutations.service.js'
import { getCustomerCart } from '../src/modules/cart/cart.service.js'
import { getProductWholesaleFromMap, getProductWholesalePricing } from '../src/modules/products/product.wholesale.service.js'
import {
  createAdminWholesalePackage,
  deleteAdminWholesalePackage,
  listAdminWholesalePackages,
  toggleAdminWholesalePackageActive,
} from '../src/modules/products/admin-wholesale.service.js'
import { resolveCheckoutCart } from '../src/modules/orders/checkout.cart.js'
import { createCheckoutOrder } from '../src/modules/orders/checkout.order.js'
import { toOrderResponse } from '../src/modules/orders/order.mapper.js'

const slug = `wholesale-opt-${Date.now().toString(36)}`
const checkoutKey = randomUUID()

const expectHttpError = async (operation: Promise<unknown>, expectedStatus: number, label: string): Promise<void> => {
  try {
    await operation
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === expectedStatus) return
    throw error
  }
  throw new Error(`Expected HTTP ${expectedStatus} error (${label}).`)
}

async function main() {
  console.info('Wholesale package (unit/size-linked) smoke test')
  const createdIds: string[] = []
  const createdOrderIds: string[] = []
  let wholesaleUserId = ''
  let retailUserId = ''

  try {
    const category = await prisma.category.create({ data: { name: `WS Opt Cat ${slug}`, slug, imageUrl: '' } })
    createdIds.push(category.id)

    // A product with two unit/size variants: "5kg" and "10kg", mirroring the
    // Plantain Flour example (5kg -> carton of 20 @ 40,000; 10kg -> carton of 10 @ 45,000).
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: 'Plantain Flour (WS)',
        slug,
        description: 'Wholesale option-linked package fixture',
        price: '1500.00',
        deliveryFee: '800.00',
        unit: 'kg',
        image: '',
        stockQuantity: 1000,
        options: {
          create: [
            { label: '5kg', price: '2800.00', stockQuantity: 100, sortOrder: 0, isActive: true },
            { label: '10kg', price: '4800.00', stockQuantity: 50, sortOrder: 1, isActive: true },
          ],
        },
      },
    })
    createdIds.push(product.id)
    const [size5kg, size10kg] = await prisma.productOption.findMany({
      where: { productId: product.id },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, label: true, stockQuantity: true },
    })

    const wholesaleCustomer = await prisma.user.create({
      data: { name: 'WS Customer', email: `${slug}@example.com`, role: UserRole.CUSTOMER, shoppingMode: ShoppingMode.WHOLESALE, emailVerified: true },
    })
    createdIds.push(wholesaleCustomer.id)
    wholesaleUserId = wholesaleCustomer.id
    const retailCustomer = await prisma.user.create({
      data: { name: 'Retail Customer', email: `${slug}-retail@example.com`, role: UserRole.CUSTOMER, shoppingMode: ShoppingMode.RETAIL, emailVerified: true },
    })
    createdIds.push(retailCustomer.id)
    retailUserId = retailCustomer.id

    // --- A wholesale package belongs to a specific unit/size ---
    const carton5 = await createAdminWholesalePackage(product.id, {
      productOptionId: size5kg.id,
      name: 'Carton',
      unitsPerPackage: 20,
      price: '40000.00',
      isActive: true,
      sortOrder: 0,
    })
    if (carton5.productOptionId !== size5kg.id) {
      throw new Error('Created wholesale package should be linked to the 5kg unit/size.')
    }
    if (Number(carton5.price) !== 40000 || carton5.unitsPerPackage !== 20) {
      throw new Error('Created wholesale package does not match input.')
    }

    // --- One unit/size can have multiple package configurations ---
    const crate5 = await createAdminWholesalePackage(product.id, {
      productOptionId: size5kg.id,
      name: 'Crate',
      unitsPerPackage: 25,
      price: '45000.00',
      isActive: true,
      sortOrder: 1,
    })

    // --- The other unit/size has its own, independent package ---
    const carton10 = await createAdminWholesalePackage(product.id, {
      productOptionId: size10kg.id,
      name: 'Carton',
      unitsPerPackage: 10,
      price: '45000.00',
      isActive: true,
      sortOrder: 0,
    })

    // Duplicate config is rejected WITHIN the same unit/size scope.
    await expectHttpError(
      createAdminWholesalePackage(product.id, { productOptionId: size5kg.id, name: 'Carton', unitsPerPackage: 20, price: '40000.00' }),
      400,
      'dup name scoped',
    )
    await expectHttpError(
      createAdminWholesalePackage(product.id, { productOptionId: size5kg.id, name: 'Other', unitsPerPackage: 25, price: '45000.00' }),
      400,
      'dup config scoped',
    )
    // The same "Carton" name on a DIFFERENT size is allowed (it is scoped per unit/size).
    const carton10NameCheck = (await listAdminWholesalePackages(product.id))
      .filter((pkg) => pkg.name === 'Carton')
    if (carton10NameCheck.length !== 2) throw new Error('A package name should be reusable across different sizes.')
    // units must be a positive whole number, price positive.
    await expectHttpError(createAdminWholesalePackage(product.id, { productOptionId: size5kg.id, name: 'Bad Units', unitsPerPackage: 0, price: '100.00' }), 400, 'zero units')
    await expectHttpError(createAdminWholesalePackage(product.id, { productOptionId: size5kg.id, name: 'Bad Price', unitsPerPackage: 5, price: '0.00' }), 400, 'zero price')
    // An option that does not belong to this product is rejected.
    const otherCat = await prisma.category.create({ data: { name: `WS Other Cat ${slug}`, slug: `${slug}-other`, imageUrl: '' } })
    createdIds.push(otherCat.id)
    const otherProduct = await prisma.product.create({
      data: { categoryId: otherCat.id, name: 'Other', slug: `${slug}-other-prod`, description: 'Stray option fixture', price: '10.00', unit: 'unit', image: '', stockQuantity: 5 },
    })
    createdIds.push(otherProduct.id)
    const strayOption = await prisma.productOption.create({
      data: { productId: otherProduct.id, label: '1kg', price: '10.00', stockQuantity: 5, sortOrder: 0 },
    })
    await expectHttpError(
      createAdminWholesalePackage(product.id, { productOptionId: strayOption.id, name: 'Bad Option', unitsPerPackage: 5, price: '100.00' }),
      400,
      'option not in product',
    )

    // --- The wholesale pricing endpoint exposes each package with its size ---
    const pricing = await getProductWholesalePricing(product.id)
    if (!pricing || pricing.packages.length !== 3) throw new Error('Wholesale pricing should expose the three option-linked packages.')
    const carton5Pricing = pricing.packages.find((p) => p.packageId === carton5.id)
    if (!carton5Pricing || carton5Pricing.productOptionId !== size5kg.id || Number(carton5Pricing.price) !== 40000 || carton5Pricing.unitsPerPackage !== 20) {
      throw new Error('Wholesale pricing package (with unit/size) is wrong.')
    }
    const fromMap = await getProductWholesaleFromMap([product.id])
    if (Number(fromMap.get(product.id)) !== 40000) throw new Error('Wholesale "from" price should be the lowest package price.')

    // --- Add 2 cartons of the 5kg Carton: subtotal = price-per-carton x cartons ---
    const addResult = await addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
      productId: product.id,
      productOptionId: size5kg.id,
      wholesalePackageId: carton5.id,
      quantity: 2,
    })
    const carton5Line = addResult.items.find((item) => item.wholesalePackageId === carton5.id)
    if (!carton5Line) throw new Error('Wholesale cart line missing the carton package.')
    if (carton5Line.productOptionId !== size5kg.id) throw new Error('Wholesale cart line should carry the unit/size.')
    if (Number(carton5Line.price) !== 40000) throw new Error('Cart line price should be the per-carton price from the DB.')
    if (carton5Line.quantity !== 2) throw new Error('Cart line quantity should equal the number of cartons.')
    if (Number(carton5Line.itemSubtotal) !== 80000) {
      throw new Error('Cart line subtotal should be price x cartons.')
    }
    if (carton5Line.wholesaleUnitsPerPackage !== 20) throw new Error('Cart line should report units per package.')

    // --- Missing package selection in wholesale mode is rejected ---
    await expectHttpError(
      addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
        productId: product.id,
        productOptionId: size5kg.id,
        wholesalePackageId: null,
        quantity: 1,
      }),
      400,
      'missing package',
    )

    // --- Invalid (nonexistent) package ID is rejected ---
    await expectHttpError(
      addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
        productId: product.id,
        productOptionId: size5kg.id,
        wholesalePackageId: '00000000-0000-4000-8000-000000000000',
        quantity: 1,
      }),
      400,
      'nonexistent package',
    )

    // --- A package that does not match its unit/size is rejected (invalid unit) ---
    await expectHttpError(
      addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
        productId: product.id,
        productOptionId: size10kg.id,
        wholesalePackageId: carton5.id,
        quantity: 1,
      }),
      409,
      'size/package mismatch',
    )

    // --- Invalid / negative / non-integer carton quantity is rejected ---
    await expectHttpError(
      addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
        productId: product.id,
        productOptionId: size5kg.id,
        wholesalePackageId: carton5.id,
        quantity: 0,
      }),
      400,
      'zero quantity',
    )
    await expectHttpError(
      addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
        productId: product.id,
        productOptionId: size5kg.id,
        wholesalePackageId: carton5.id,
        quantity: -3,
      }),
      400,
      'negative quantity',
    )

    // --- Availability is capped by the size's stock, not the product's ---
    // size5kg stock = 100 units -> 5 cartons of 20. Adding 6 cartons of the 5kg
    // Carton would need 120 units, so it must be rejected even though product
    // stock (1000) is high.
    await expectHttpError(
      addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
        productId: product.id,
        productOptionId: size5kg.id,
        wholesalePackageId: carton5.id,
        quantity: 6,
      }),
      409,
      'over availability',
    )

    // --- Multiple packages (different sizes) in one wholesale cart are distinct lines ---
    await addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
      productId: product.id,
      productOptionId: size10kg.id,
      wholesalePackageId: carton10.id,
      quantity: 1,
    })
    const multiCart = await getCustomerCart(wholesaleUserId, ShoppingMode.WHOLESALE)
    const wholesaleLines = multiCart.items.filter((item) => item.wholesalePackageId)
    if (wholesaleLines.length !== 2) throw new Error('Wholesale cart should hold two distinct package lines (one per size).')
    const carton10Line = wholesaleLines.find((item) => item.wholesalePackageId === carton10.id)
    if (!carton10Line || Number(carton10Line.itemSubtotal) !== 45000) throw new Error('10kg carton line subtotal is wrong.')

    // --- Multiple cartons of the same package accumulate quantity & subtotal ---
    await addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
      productId: product.id,
      productOptionId: size5kg.id,
      wholesalePackageId: carton5.id,
      quantity: 3,
    })
    const accumulated = await getCustomerCart(wholesaleUserId, ShoppingMode.WHOLESALE)
    const carton5Acc = accumulated.items.find((item) => item.wholesalePackageId === carton5.id)
    if (!carton5Acc || carton5Acc.quantity !== 5) throw new Error('Cartons should accumulate to 5.')
    if (Number(carton5Acc.itemSubtotal) !== 200000) throw new Error('Accumulated carton subtotal is wrong.')

    // --- Updating a wholesale line keeps the unit/size + package and is capped
    // by that size's stock (floor(100 / 20) = 5 cartons) ---
    const updatedCart = await updateCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, carton5Acc.id, 5)
    const updatedCarton5 = updatedCart.items.find((item) => item.wholesalePackageId === carton5.id)
    if (!updatedCarton5 || updatedCarton5.productOptionId !== size5kg.id || updatedCarton5.quantity !== 5 || Number(updatedCarton5.itemSubtotal) !== 200000) {
      throw new Error('Wholesale cart line update should keep the unit/size and package.')
    }
    await expectHttpError(
      updateCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, carton5Acc.id, 6),
      409,
      'update over size stock',
    )

    // --- Inactive package is rejected on add ---
    await toggleAdminWholesalePackageActive(carton5.id, false)
    await expectHttpError(
      addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
        productId: product.id,
        productOptionId: size5kg.id,
        wholesalePackageId: carton5.id,
        quantity: 1,
      }),
      409,
      'inactive package',
    )
    await toggleAdminWholesalePackageActive(carton5.id, true)

    // --- Retail is completely unaffected: simple-unit line uses retail price ---
    const retailAdd = await addCustomerCartItem(retailUserId, ShoppingMode.RETAIL, {
      productId: product.id,
      productOptionId: null,
      wholesalePackageId: null,
      quantity: 2,
    })
    const retailLine = retailAdd.items[0]
    if (retailLine.wholesalePackageId !== null) throw new Error('Retail line should have no package.')
    if (Number(retailLine.price) !== 1500 || Number(retailLine.itemSubtotal) !== 3000) {
      throw new Error('Retail price should be used for retail cart.')
    }

    // --- Tampered "frontend price": no price field exists on the input; the
    // subtotal is always re-derived from the DB package price, never the client.
    const cartonList = await listAdminWholesalePackages(product.id)
    if (cartonList.length !== 3) throw new Error('Admin list should return the three packages.')

    // --- Checkout: server re-derives wholesale pricing from the DB package ---
    await prisma.paymentSettings.upsert({
      where: { singletonKey_paymentMethod: { singletonKey: 'default', paymentMethod: PaymentMethod.BANK_TRANSFER } },
      update: { isActive: true },
      create: {
        singletonKey: 'default',
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        bankName: 'Smoke Bank',
        accountName: 'Smoke',
        accountNumber: '0123456789',
        instructions: 'Smoke',
        isActive: true,
      },
    })
    const checkoutResolved = await prisma.$transaction((transaction) =>
      resolveCheckoutCart(
        transaction,
        { id: wholesaleUserId, shoppingMode: ShoppingMode.WHOLESALE },
        {
          checkoutKey,
          customerName: 'WS Customer',
          phone: '+2348012345678',
          email: `${slug}@example.com`,
          fulfillmentMethod: FulfillmentMethod.PICKUP,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
        },
      ),
    )
    if (!checkoutResolved.isWholesale) throw new Error('Checkout should be flagged wholesale.')
    const checkoutCarton5 = checkoutResolved.orderItems.find((item) => item.wholesalePackageId === carton5.id)
    if (!checkoutCarton5) throw new Error('Checkout order item missing the 5kg carton package.')
    if (checkoutCarton5.quantity !== 5) throw new Error('Checkout quantity should be the number of cartons.')
    if (Number(checkoutCarton5.unitPrice) !== 40000) throw new Error('Checkout must use the DB package price.')
    if (checkoutCarton5.wholesalePackageName !== 'Carton') throw new Error('Checkout should snapshot package name.')
    if (checkoutCarton5.wholesaleUnitsPerPackage !== 20) throw new Error('Checkout should snapshot units per package.')
    const checkoutCarton10 = checkoutResolved.orderItems.find((item) => item.wholesalePackageId === carton10.id)
    if (!checkoutCarton10) throw new Error('Checkout order item missing the 10kg carton package.')
    const expectedSubtotal = new Prisma.Decimal(40000).mul(5).add(new Prisma.Decimal(45000))
    if (!checkoutResolved.subtotal.equals(expectedSubtotal)) {
      throw new Error(`Checkout subtotal ${checkoutResolved.subtotal} does not match expected ${expectedSubtotal}.`)
    }

    const persisted = await prisma.$transaction((transaction) =>
      createCheckoutOrder(transaction, {
        input: {
          checkoutKey,
          customerName: 'WS Customer',
          phone: '+2348012345678',
          email: 'ws@example.com',
          fulfillmentMethod: FulfillmentMethod.PICKUP,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
        },
        user: { id: wholesaleUserId, email: 'ws@example.com' },
        isWholesale: checkoutResolved.isWholesale,
        cartId: checkoutResolved.cartId ?? null,
        cartItems: checkoutResolved.cartItems,
        orderItems: checkoutResolved.orderItems,
        subtotal: checkoutResolved.subtotal,
        paymentSettings: checkoutResolved.paymentSettings,
      }),
    )
    const mappedOrder = toOrderResponse(persisted)
    const persistedCarton5 = mappedOrder.orderItems.find((item) => item.wholesalePackageId === carton5.id)
    if (!persistedCarton5) throw new Error('Persisted order item missing the 5kg carton package.')
    if (persistedCarton5.wholesalePackageName !== 'Carton') throw new Error('Persisted order should snapshot package name.')
    if (persistedCarton5.wholesaleUnitsPerPackage !== 20) throw new Error('Persisted order should snapshot units per package.')
    if (persistedCarton5.quantity !== 5) throw new Error('Persisted order quantity should be number of cartons.')
    if (Number(persistedCarton5.unitPrice) !== 40000) throw new Error('Persisted order must use the DB package price.')
    createdOrderIds.push(persisted.id)

    console.info('ALL WHOLESALE PACKAGE (OPTION-LINKED) SMOKE CHECKS PASSED')
  } finally {
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } })
    await prisma.customerCartItem.deleteMany({ where: { productId: { in: createdIds } } })
    await prisma.wholesalePackage.deleteMany({ where: { productId: { in: createdIds } } })
    await prisma.productOption.deleteMany({ where: { productId: { in: createdIds } } })
    await prisma.paymentSettings.deleteMany({ where: { bankName: 'Smoke Bank' } })
    await prisma.user.deleteMany({ where: { id: { in: [wholesaleUserId, retailUserId].filter(Boolean) } } })
    await prisma.product.deleteMany({ where: { id: { in: createdIds } } })
    await prisma.category.deleteMany({ where: { id: { in: createdIds } } })
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeDatabase()
  })
