import { FulfillmentMethod, PaymentMethod, Prisma, ShoppingMode, UserRole } from '@prisma/client'
import { prisma, closeDatabase } from '../src/config/prisma.js'
import { HttpError } from '../src/utils/http.js'
import { addCustomerCartItem } from '../src/modules/cart/cart.mutations.service.js'
import { getCustomerCart } from '../src/modules/cart/cart.service.js'
import { getProductWholesaleFromMap, getProductWholesalePricing } from '../src/modules/products/product.wholesale.service.js'
import {
  createAdminWholesalePackage,
  deleteAdminWholesalePackage,
  listAdminWholesalePackages,
  toggleAdminWholesalePackageActive,
} from '../src/modules/products/admin-wholesale.service.js'
import { resolveCheckoutCart } from '../src/modules/orders/checkout.cart.js'

const slug = `wholesale-pkg-${Date.now().toString(36)}`

const expectHttpError = async (operation: Promise<unknown>, expectedStatus: number): Promise<void> => {
  try {
    await operation
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === expectedStatus) return
    throw error
  }
  throw new Error(`Expected HTTP ${expectedStatus} error.`)
}

async function main() {
  console.info('Wholesale package smoke test')
  const createdIds: string[] = []
  let wholesaleUserId = ''
  let retailUserId = ''

  try {
    const category = await prisma.category.create({ data: { name: `WS Package Cat ${slug}`, slug, imageUrl: '' } })
    createdIds.push(category.id)
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: 'WS Package Product',
        slug,
        description: 'Wholesale package smoke fixture',
        price: '1500.00',
        deliveryFee: '800.00',
        unit: 'unit',
        image: '',
        stockQuantity: 100,
      },
    })
    createdIds.push(product.id)

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

    // --- Phase 2 case: one package, and package price is authoritative ---
    const carton = await createAdminWholesalePackage(product.id, {
      name: 'Carton',
      unitsPerPackage: 10,
      price: '20000.00',
      isActive: true,
      sortOrder: 0,
    })
    if (carton.price !== '20000.00' || carton.unitsPerPackage !== 10) {
      throw new Error('Created wholesale package does not match input.')
    }

    // --- Phase 2 case: multiple packages ---
    const crate = await createAdminWholesalePackage(product.id, {
      name: 'Crate',
      unitsPerPackage: 25,
      price: '45000.00',
      isActive: true,
      sortOrder: 1,
    })

    // Duplicate config is rejected: same name, and same units+price.
    await expectHttpError(
      createAdminWholesalePackage(product.id, { name: 'Carton', unitsPerPackage: 10, price: '20000.00' }),
      400,
    )
    await expectHttpError(
      createAdminWholesalePackage(product.id, { name: 'Other', unitsPerPackage: 25, price: '45000.00' }),
      400,
    )
    // units must be a positive whole number and price must be positive.
    await expectHttpError(createAdminWholesalePackage(product.id, { name: 'Bad Units', unitsPerPackage: 0, price: '100.00' }), 400)
    await expectHttpError(createAdminWholesalePackage(product.id, { name: 'Bad Price', unitsPerPackage: 5, price: '0.00' }), 400)

    // --- Wholesale pricing endpoint returns active packages ---
    const pricing = await getProductWholesalePricing(product.id)
    if (!pricing || pricing.packages.length !== 2) throw new Error('Wholesale pricing should expose the two active packages.')
    const cartonPricing = pricing.packages.find((p) => p.packageId === carton.id)
    if (!cartonPricing || cartonPricing.price !== '20000.00' || cartonPricing.unitsPerPackage !== 10) {
      throw new Error('Wholesale pricing package data is wrong.')
    }
    const fromMap = await getProductWholesaleFromMap([product.id])
    if (fromMap.get(product.id) !== '20000.00') throw new Error('Wholesale "from" price should be the lowest package price.')

    // --- Add 2 cartons: subtotal must be price-per-carton x cartons (server-derived) ---
    const addResult = await addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
      productId: product.id,
      productOptionId: null,
      wholesalePackageId: carton.id,
      quantity: 2,
    })
    const cartonLine2 = addResult.items.find((item) => item.wholesalePackageId === carton.id)
    if (!cartonLine2) throw new Error('Wholesale cart line missing the carton package.')
    if (cartonLine2.price !== '20000.00') throw new Error('Cart line price should be the per-carton price from the DB.')
    if (cartonLine2.quantity !== 2) throw new Error('Cart line quantity should equal the number of cartons.')
    if (cartonLine2.itemSubtotal !== '40000.00') throw new Error('Cart line subtotal should be price x cartons.')
    if (cartonLine2.wholesaleUnitsPerPackage !== 10) throw new Error('Cart line should report units per package.')

    // --- Missing package selection in wholesale mode is rejected ---
    await expectHttpError(
      addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
        productId: product.id,
        productOptionId: null,
        wholesalePackageId: null,
        quantity: 1,
      }),
      400,
    )

    // --- Invalid package ID is rejected ---
    await expectHttpError(
      addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
        productId: product.id,
        productOptionId: null,
        wholesalePackageId: '00000000-0000-4000-8000-000000000000',
        quantity: 1,
      }),
      404,
    )
    // --- Invalid / negative / non-integer carton quantity is rejected ---
    await expectHttpError(
      addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
        productId: product.id,
        productOptionId: null,
        wholesalePackageId: carton.id,
        quantity: 0,
      }),
      400,
    )
    await expectHttpError(
      addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
        productId: product.id,
        productOptionId: null,
        wholesalePackageId: carton.id,
        quantity: -3,
      }),
      400,
    )

    // --- Multiple packages in one wholesale cart stay as distinct lines ---
    await addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
      productId: product.id,
      productOptionId: null,
      wholesalePackageId: crate.id,
      quantity: 1,
    })
    const multiCart = await getCustomerCart(wholesaleUserId, ShoppingMode.WHOLESALE)
    if (multiCart.items.length !== 2) throw new Error('Wholesale cart should hold two distinct package lines.')
    const crateLine = multiCart.items.find((item) => item.wholesalePackageId === crate.id)
    if (!crateLine || crateLine.itemSubtotal !== '45000.00') throw new Error('Crate line subtotal is wrong.')

    // --- Multiple cartons of the same package accumulate quantity & subtotal ---
    await addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
      productId: product.id,
      productOptionId: null,
      wholesalePackageId: carton.id,
      quantity: 3,
    })
    const accumulated = await getCustomerCart(wholesaleUserId, ShoppingMode.WHOLESALE)
    const cartonLine5 = accumulated.items.find((item) => item.wholesalePackageId === carton.id)
    if (!cartonLine5 || cartonLine5.quantity !== 5) throw new Error('Cartons should accumulate to 5.')
    if (cartonLine5.itemSubtotal !== '100000.00') throw new Error('Accumulated carton subtotal is wrong.')

    // --- Inactive package is rejected on add ---
    await toggleAdminWholesalePackageActive(carton.id, false)
    await expectHttpError(
      addCustomerCartItem(wholesaleUserId, ShoppingMode.WHOLESALE, {
        productId: product.id,
        productOptionId: null,
        wholesalePackageId: carton.id,
        quantity: 1,
      }),
      409,
    )
    await toggleAdminWholesalePackageActive(carton.id, true)

    // --- Retail is completely unaffected: simple-unit line uses retail price ---
    const retailAdd = await addCustomerCartItem(retailUserId, ShoppingMode.RETAIL, {
      productId: product.id,
      productOptionId: null,
      wholesalePackageId: null,
      quantity: 2,
    })
    const retailLine = retailAdd.items[0]
    if (retailLine.wholesalePackageId !== null) throw new Error('Retail line should have no package.')
    if (retailLine.price !== '1500.00' || retailLine.itemSubtotal !== '3000.00') {
      throw new Error('Retail price should be used for retail cart.')
    }

    // --- Tampered "frontend price": no price field exists on the input; the
    // subtotal is always re-derived from the DB package price, never the client.
    const cartonList = await listAdminWholesalePackages(product.id)
    if (cartonList.length !== 2) throw new Error('Admin list should return both packages.')

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
          checkoutKey: `ws-pkg-${slug}-1`,
          customerName: 'WS Customer',
          phone: '+2348012345678',
          email: `${slug}@example.com`,
          fulfillmentMethod: FulfillmentMethod.PICKUP,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
        },
      ),
    )
    if (!checkoutResolved.isWholesale) throw new Error('Checkout should be flagged wholesale.')
    const checkoutCarton = checkoutResolved.orderItems.find((item) => item.wholesalePackageId === carton.id)
    if (!checkoutCarton) throw new Error('Checkout order item missing carton package.')
    if (checkoutCarton.quantity !== 5) throw new Error('Checkout quantity should be the number of cartons.')
    if (checkoutCarton.unitPrice.toString() !== '20000.00') throw new Error('Checkout must use the DB package price.')
    if (checkoutCarton.wholesalePackageName !== 'Carton') throw new Error('Checkout should snapshot package name.')
    if (checkoutCarton.wholesaleUnitsPerPackage !== 10) throw new Error('Checkout should snapshot units per package.')
    const expectedSubtotal = new Prisma.Decimal(20000).mul(5).add(new Prisma.Decimal(45000))
    if (!checkoutResolved.subtotal.equals(expectedSubtotal)) {
      throw new Error(`Checkout subtotal ${checkoutResolved.subtotal} does not match expected ${expectedSubtotal}.`)
    }

    console.info('ALL WHOLESALE PACKAGE SMOKE CHECKS PASSED')
  } finally {
    await prisma.wholesalePackage.deleteMany({ where: { productId: { in: createdIds } } })
    await prisma.customerCartItem.deleteMany({ where: { productId: { in: createdIds } } })
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
