import { randomUUID } from 'node:crypto'
import { OrderStatus, Prisma, UserRole } from '@prisma/client'
import { prisma, closeDatabase } from '../src/lib/prisma.js'
import { addCustomerCartItem, clearCustomerCart, updateCustomerCartItem } from '../src/modules/cart/cart.service.js'
import { updateAdminOrderStatus } from '../src/modules/admin/admin.service.js'
import { checkoutCustomerCart } from '../src/modules/orders/order.service.js'
import { PaymentMethod } from '@prisma/client'
import { HttpError } from '../src/utils/http.js'

const slug = `inventory-smoke-${Date.now()}`
const checkoutInput = (checkoutKey: string) => ({
  checkoutKey,
  customerName: 'Inventory Smoke Test',
  phone: '08000000000',
  deliveryAddress: 'Test address',
  city: 'Ibadan',
  paymentMethod: PaymentMethod.BANK_TRANSFER,
})

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
  const category = await prisma.category.create({
    data: { name: `Inventory Smoke ${slug}`, slug, imageUrl: '' },
  })
  const customer = await prisma.user.create({
    data: { name: 'Inventory Smoke Customer', email: `${slug}@example.com`, role: UserRole.CUSTOMER },
  })
  const admin = await prisma.user.create({
    data: { name: 'Inventory Smoke Admin', email: `${slug}-admin@example.com`, role: UserRole.ADMIN },
  })
  const cartProduct = await prisma.product.create({
    data: {
      categoryId: category.id,
      name: 'Cart Smoke Product',
      slug: `${slug}-cart`,
      description: 'Temporary inventory smoke product',
      price: '100.00',
      unit: 'unit',
      image: '',
      stockQuantity: 5,
    },
  })
  const outOfStockProduct = await prisma.product.create({
    data: {
      categoryId: category.id,
      name: 'Out Of Stock Smoke Product',
      slug: `${slug}-empty`,
      description: 'Temporary inventory smoke product',
      price: '100.00',
      unit: 'unit',
      image: '',
      stockQuantity: 0,
    },
  })
  const concurrentProduct = await prisma.product.create({
    data: {
      categoryId: category.id,
      name: 'Concurrent Smoke Product',
      slug: `${slug}-concurrent`,
      description: 'Temporary inventory smoke product',
      price: '5000.00',
      unit: 'unit',
      image: '',
      stockQuantity: 1,
    },
  })
  const rollbackProduct = await prisma.product.create({
    data: {
      categoryId: category.id,
      name: 'Rollback Smoke Product',
      slug: `${slug}-rollback`,
      description: 'Temporary inventory smoke product',
      price: '250.00',
      unit: 'unit',
      image: '',
      stockQuantity: 3,
    },
  })

  const createSmokeOrder = async (productId: string, quantity: number) => {
    await clearCustomerCart(customer.id)
    await addCustomerCartItem(customer.id, { productId, quantity })
    return checkoutCustomerCart(customer.id, checkoutInput(randomUUID()))
  }

  try {
    const addedCart = await addCustomerCartItem(customer.id, { productId: cartProduct.id, quantity: 2 })
    if (addedCart.items[0]?.quantity !== 2) throw new Error('Available product was not added to cart.')
    await expectHttpError(
      addCustomerCartItem(customer.id, { productId: outOfStockProduct.id, quantity: 1 }),
      409,
    )
    await expectHttpError(
      addCustomerCartItem(customer.id, { productId: cartProduct.id, quantity: 4 }),
      409,
    )
    const cartItem = await prisma.customerCartItem.findFirstOrThrow({
      where: { cart: { userId: customer.id }, productId: cartProduct.id },
    })
    await expectHttpError(updateCustomerCartItem(customer.id, cartItem.id, 6), 409)

    await expectHttpError(createSmokeOrder(rollbackProduct.id, 4), 409)
    const rollbackState = await prisma.product.findUniqueOrThrow({ where: { id: rollbackProduct.id } })
    if (rollbackState.stockQuantity !== 3) throw new Error('Failed checkout changed stock.')
    const rollbackOrders = await prisma.order.count({ where: { orderItems: { some: { productId: rollbackProduct.id } } } })
    if (rollbackOrders !== 0) throw new Error('Failed checkout created a partial order.')

    await clearCustomerCart(customer.id)
    await addCustomerCartItem(customer.id, { productId: concurrentProduct.id, quantity: 1 })
    const results = await Promise.allSettled([
      checkoutCustomerCart(customer.id, checkoutInput(randomUUID())),
      checkoutCustomerCart(customer.id, checkoutInput(randomUUID())),
    ])
    const successes = results.filter((result) => result.status === 'fulfilled')
    if (successes.length !== 1) throw new Error(`Expected exactly one concurrent purchase, got ${successes.length}.`)

    const successfulOrder = (successes[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof createOrder>>>).value
    const afterPurchase = await prisma.product.findUniqueOrThrow({ where: { id: concurrentProduct.id } })
    if (afterPurchase.stockQuantity !== 0) throw new Error('Concurrent purchase did not consume the final unit exactly once.')
    const purchaseItem = await prisma.orderItem.findFirstOrThrow({ where: { orderId: successfulOrder.id } })
    if (!purchaseItem.unitPrice.equals(new Prisma.Decimal('5000.00'))) throw new Error('Historical order price was not preserved.')

    await prisma.product.update({ where: { id: concurrentProduct.id }, data: { price: '6000.00' } })
    const historicalItem = await prisma.orderItem.findFirstOrThrow({ where: { id: purchaseItem.id } })
    if (!historicalItem.unitPrice.equals(new Prisma.Decimal('5000.00'))) throw new Error('Product price change altered an existing order.')

    await updateAdminOrderStatus(successfulOrder.orderNumber, { orderStatus: OrderStatus.CANCELLED }, admin.id)
    await updateAdminOrderStatus(successfulOrder.orderNumber, { orderStatus: OrderStatus.CANCELLED }, admin.id)
    const afterCancellation = await prisma.product.findUniqueOrThrow({ where: { id: concurrentProduct.id } })
    if (afterCancellation.stockQuantity !== 1) throw new Error('Cancellation did not restore stock exactly once.')
    const adjustments = await prisma.productStockAdjustment.findMany({
      where: { productId: concurrentProduct.id, orderId: successfulOrder.id },
    })
    if (adjustments.filter((adjustment) => adjustment.quantityDelta === -1).length !== 1) {
      throw new Error('Purchase stock audit entry is incorrect.')
    }
    if (adjustments.filter((adjustment) => adjustment.quantityDelta === 1).length !== 1) {
      throw new Error('Cancellation stock audit entry is incorrect.')
    }

    console.log('Inventory safety smoke test passed.')
  } finally {
    await clearCustomerCart(customer.id)
    await prisma.productStockAdjustment.deleteMany({ where: { productId: { in: [cartProduct.id, outOfStockProduct.id, concurrentProduct.id, rollbackProduct.id] } } })
    await prisma.order.deleteMany({ where: { orderItems: { some: { productId: { in: [cartProduct.id, outOfStockProduct.id, concurrentProduct.id, rollbackProduct.id] } } } } })
    await prisma.product.deleteMany({ where: { id: { in: [cartProduct.id, outOfStockProduct.id, concurrentProduct.id, rollbackProduct.id] } } })
    await prisma.user.deleteMany({ where: { id: { in: [customer.id, admin.id] } } })
    await prisma.category.delete({ where: { id: category.id } })
  }
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeDatabase()
  })