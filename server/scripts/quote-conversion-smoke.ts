import { FulfillmentMethod, PaymentStatus, QuoteRequestStatus, UserRole } from '@prisma/client'
import { prisma, closeDatabase } from '../src/lib/prisma.js'
import {
  acceptQuoteRequest,
  getAdminQuoteRequest,
  getCustomerQuoteRequest,
  prepareQuotePricing,
  updateAdminQuoteRequestStatus,
} from '../src/modules/quotes/quote.service.js'
import { convertQuoteRequestToOrder } from '../src/modules/orders/order.service.js'
import { hashPassword, loginCustomer } from '../src/modules/auth/auth.service.js'
import { HttpError } from '../src/utils/http.js'

const slug = `quote-convert-smoke-${Date.now().toString(36)}`
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:8000'

const expectHttpError = async (operation: Promise<unknown>, expectedStatus: number): Promise<void> => {
  try {
    await operation
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === expectedStatus) return
    throw error
  }
  throw new Error(`Expected HTTP ${expectedStatus} error.`)
}

const expectNotFound = (operation: Promise<unknown>): Promise<void> => expectHttpError(operation, 404)
const expectConflict = (operation: Promise<unknown>): Promise<void> => expectHttpError(operation, 409)

const moneyEquals = (serialized: string | null, expected: number): boolean => {
  if (serialized === null) return false
  return Math.abs(Number(serialized) - expected) < 0.001
}

const ACCEPTED = QuoteRequestStatus.ACCEPTED
const PENDING = QuoteRequestStatus.PENDING
const COMPLETED = QuoteRequestStatus.COMPLETED
const CANCELLED = QuoteRequestStatus.CANCELLED
const QUOTED = QuoteRequestStatus.QUOTED

async function main() {
  let categoryId = ''
  let productId = ''
  let paymentSettingsCreated = false
  const customerEmailA = `${slug}-a@smoke.local`
  const customerEmailB = `${slug}-b@smoke.local`
  const customerEmailC = `${slug}-c@smoke.local`
  const quoteNumbers: string[] = []
  const createdUserIds: string[] = []

  const createQuote = async (userId: string, quantity: number): Promise<string> => {
    const quoteRequest = await prisma.quoteRequest.create({
      data: {
        quoteNumber: `QR-2097-${String(100000 + quoteNumbers.length)}`,
        requestKey: `${slug}-key-${quoteNumbers.length}`,
        userId,
        customerName: `Conversion Customer ${quoteNumbers.length}`,
        customerEmail: `${slug}-${quoteNumbers.length}@smoke.local`,
        customerPhone: '+2348091110000',
        message: 'Price this for me.',
        shoppingMode: 'RETAIL',
        status: PENDING,
        items: {
          create: [{ productId, productName: 'Smoke Product', productOptionId: null, productOptionLabel: null, quantity, note: null }],
        },
      },
      select: { id: true, quoteNumber: true },
    })
    quoteNumbers.push(quoteRequest.quoteNumber)
    return quoteRequest.quoteNumber
  }

  const priceQuote = async (
    reference: string,
    quotedUnitPrice: string,
    deliveryFee = '0.00',
    fulfillmentMethod: 'PICKUP' | 'DELIVERY' = 'PICKUP',
  ): Promise<void> => {
    const { items } = await getAdminQuoteRequest(reference)
    await prepareQuotePricing(reference, {
      items: items.map((item) => ({ itemId: item.id, quotedUnitPrice })),
      deliveryFee,
      fulfillmentMethod,
    })
  }

  const orderCountFor = async (userId: string): Promise<number> =>
    prisma.order.count({ where: { userId } })

  const quoteFor = async (reference: string) =>
    (await prisma.quoteRequest.findUniqueOrThrow({ where: { quoteNumber: reference } }))

  const stockFor = async (): Promise<number> =>
    (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity

  try {
    const category = await prisma.category.create({
      data: { name: `Smoke Category ${slug}`, slug: `smoke-category-${slug}` },
    })
    categoryId = category.id
    const product = await prisma.product.create({
      data: {
        categoryId,
        name: 'Smoke Product',
        slug: `smoke-product-${slug}`,
        description: 'Smoke fixture',
        price: 2500,
        deliveryFee: 0,
        stockQuantity: 50,
        unit: 'bag',
        image: '',
      },
    })
    productId = product.id

    const existingPaymentSettings = await prisma.paymentSettings.findUnique({
      where: { singletonKey_paymentMethod: { singletonKey: 'default', paymentMethod: 'BANK_TRANSFER' } },
    })
    if (!existingPaymentSettings) {
      await prisma.paymentSettings.create({
        data: {
          singletonKey: 'default',
          paymentMethod: 'BANK_TRANSFER',
          bankName: 'Smoke Bank',
          accountName: 'Smoke Account',
          accountNumber: '0000000000',
          instructions: 'Smoke payment instructions.',
        },
      })
      paymentSettingsCreated = true
    }

    const passwordHash = await hashPassword('smoke-password-123')
    const userA = await prisma.user.create({ data: { name: 'Conversion Customer A', email: customerEmailA, passwordHash, role: UserRole.CUSTOMER, emailVerified: true } })
    const userB = await prisma.user.create({ data: { name: 'Conversion Customer B', email: customerEmailB, passwordHash, role: UserRole.CUSTOMER, emailVerified: true } })
    const userC = await prisma.user.create({ data: { name: 'Conversion Customer C', email: customerEmailC, passwordHash, role: UserRole.CUSTOMER, emailVerified: false } })
    createdUserIds.push(userA.id, userB.id, userC.id)

    // --- 1. An accepted pickup quotation converts into a normal order ---
    const reference = await createQuote(userA.id, 4)
    await priceQuote(reference, '7500.00')
    const accepted = await acceptQuoteRequest(reference, userA.id)
    if (accepted.status !== ACCEPTED) throw new Error('Quote did not reach ACCEPTED before conversion.')

    const beforeOrderCount = await orderCountFor(userA.id)
    const beforeStock = await stockFor()
    const conversion = await convertQuoteRequestToOrder(userA.id, reference, {})
    if (!conversion.created) throw new Error('First conversion was not recorded as created.')
    const order = conversion.order
    if (!moneyEquals(order.subtotal, 30_000)) throw new Error(`Converted subtotal is wrong: ${order.subtotal}`)
    if (!moneyEquals(order.deliveryFee, 0)) throw new Error(`Converted delivery fee is wrong: ${order.deliveryFee}`)
    if (!moneyEquals(order.total, 30_000)) throw new Error(`Converted total is wrong: ${order.total}`)
    if (order.quoteNumber !== reference) throw new Error('Converted order is not linked to its quotation.')
    if (order.fulfillmentMethod !== FulfillmentMethod.PICKUP) throw new Error('Converted order lost the pickup fulfillment method.')
    if (order.paymentStatus !== PaymentStatus.PENDING) throw new Error(`Converted order payment should be PENDING, got ${order.paymentStatus}.`)
    if (order.orderStatus !== 'ORDER_PLACED') throw new Error('Converted order is not ORDER_PLACED.')
    if (order.email !== userA.email) throw new Error('Converted order should use the verified account email.')
    if (order.orderItems.length !== 1) throw new Error('Converted order does not carry the quotation items.')
    if (order.orderItems[0].quantity !== 4 || !moneyEquals(order.orderItems[0].unitPrice, 7500)) {
      throw new Error('Converted order items do not match the quotation snapshot.')
    }
    if (order.statusHistory[0]?.newStatus !== 'ORDER_PLACED') throw new Error('Converted order has no ORDER_PLACED status history.')
    if ((await orderCountFor(userA.id)) !== beforeOrderCount + 1) throw new Error('Conversion did not create exactly one order.')

    const persisted = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { paymentSnapshot: true, quoteRequest: { select: { status: true, convertedOrderId: true } } },
    })
    if (persisted.paymentSnapshot === null || persisted.paymentSnapshot.paymentMethod !== 'BANK_TRANSFER') {
      throw new Error('Converted order did not get a BANK_TRANSFER payment snapshot.')
    }
    if (persisted.quoteRequest?.status !== COMPLETED) throw new Error('Quotation was not marked COMPLETED after conversion.')
    if (persisted.stockDeductedAt === null) throw new Error('Converted order did not record stock deduction time.')
    if ((await stockFor()) !== beforeStock - 4) throw new Error('Stock was not deducted for the converted order.')

    // --- 2. Converting again is idempotent: same order, no double deduction ---
    const second = await convertQuoteRequestToOrder(userA.id, reference, {})
    if (second.created) throw new Error('Second conversion was reported as created.')
    if (second.order.id !== order.id) throw new Error('Second conversion returned a different order.')
    if ((await orderCountFor(userA.id)) !== beforeOrderCount + 1) throw new Error('Second conversion created a duplicate order.')
    if ((await stockFor()) !== beforeStock - 4) throw new Error('Second conversion deducted stock twice.')

    // --- 3. Converting a QUOTED quotation implicitly accepts it ---
    const implicitReference = await createQuote(userA.id, 2)
    await priceQuote(implicitReference, '5000.00')
    const implicitConvert = await convertQuoteRequestToOrder(userA.id, implicitReference, {})
    if (!implicitConvert.created) throw new Error('Conversion directly from QUOTED should create an order.')
    if (!moneyEquals(implicitConvert.order.total, 10_000)) throw new Error('Implicit-accept conversion total is wrong.')
    const implicitQuote = await quoteFor(implicitReference)
    if (implicitQuote.status !== COMPLETED) throw new Error('Implicit-accept quote did not reach COMPLETED.')
    if (implicitQuote.acceptedAt === null) throw new Error('Implicit-accept quote has no acceptance timestamp.')

    // --- 4. Cross-owner conversion is a 404 ---
    await expectNotFound(convertQuoteRequestToOrder(userB.id, reference, {}))

    // --- 5. Delivery quotations require an address and city ---
    const deliveryReference = await createQuote(userA.id, 3)
    await priceQuote(deliveryReference, '2000.00', '1500.00', 'DELIVERY')
    await acceptQuoteRequest(deliveryReference, userA.id)
    await expectHttpError(convertQuoteRequestToOrder(userA.id, deliveryReference, {}), 400)
    await expectHttpError(
      convertQuoteRequestToOrder(userA.id, deliveryReference, { deliveryAddress: '12 Example Street' }),
      400,
    )
    const deliveryOrder = await convertQuoteRequestToOrder(userA.id, deliveryReference, {
      deliveryAddress: '12 Example Street',
      city: 'Ibadan',
      deliveryInstructions: 'Call on arrival',
      whatsapp: '+2348091110000',
    })
    if (deliveryOrder.order.deliveryAddress !== '12 Example Street' || deliveryOrder.order.city !== 'Ibadan') {
      throw new Error('Delivery details were not stored on the converted order.')
    }
    if (deliveryOrder.order.note !== 'Call on arrival') throw new Error('Delivery instructions were not stored.')
    if (!moneyEquals(deliveryOrder.order.deliveryFee, 1500)) throw new Error('Delivery fee was not carried over.')

    // --- 6. Out-of-stock conversion fails cleanly and changes nothing ---
    const oosproduct = await prisma.product.create({
      data: {
        categoryId,
        name: 'Low Stock Product',
        slug: `smoke-low-stock-${slug}`,
        description: 'Smoke fixture',
        price: 1000,
        deliveryFee: 0,
        stockQuantity: 3,
        unit: 'bag',
        image: '',
      },
    })
    const oosQuote = await prisma.quoteRequest.create({
      data: {
        quoteNumber: `QR-2097-${String(100000 + quoteNumbers.length)}`,
        requestKey: `${slug}-key-${quoteNumbers.length}`,
        userId: userA.id,
        customerName: 'OOS Customer',
        customerEmail: `${slug}-oos@smoke.local`,
        customerPhone: '+2348091110000',
        message: 'Price this for me.',
        shoppingMode: 'RETAIL',
        status: QUOTED,
        fulfillmentMethod: 'PICKUP',
        quotedSubtotal: 10000,
        quotedTotal: 10000,
        quotedAt: new Date(),
        items: {
          create: [{ productId: oosproduct.id, productName: 'Low Stock Product', productOptionId: null, productOptionLabel: null, quantity: 10, quotedUnitPrice: 1000, note: null }],
        },
      },
      select: { quoteNumber: true },
    })
    quoteNumbers.push(oosQuote.quoteNumber)
    const beforeOosCount = await orderCountFor(userA.id)
    await expectConflict(convertQuoteRequestToOrder(userA.id, oosQuote.quoteNumber, {}))
    if ((await orderCountFor(userA.id)) !== beforeOosCount) throw new Error('Out-of-stock conversion created an order.')
    if ((await prisma.product.findUniqueOrThrow({ where: { id: oosproduct.id } })).stockQuantity !== 3) {
      throw new Error('Out-of-stock conversion deducted stock.')
    }

    // --- 7. Corrupt stored totals are rejected against the snapshot ---
    const corruptReference = await createQuote(userA.id, 2)
    await priceQuote(corruptReference, '4000.00')
    await acceptQuoteRequest(corruptReference, userA.id)
    await prisma.quoteRequest.update({
      where: { quoteNumber: corruptReference },
      data: { quotedTotal: 99999 },
    })
    await expectConflict(convertQuoteRequestToOrder(userA.id, corruptReference, {}))

    // --- 8. Unpriced / pending / cancelled quotations cannot convert ---
    const pendingReference = await createQuote(userA.id, 1)
    await expectConflict(convertQuoteRequestToOrder(userA.id, pendingReference, {}))
    const cancelledReference = await createQuote(userA.id, 1)
    await priceQuote(cancelledReference, '1000.00')
    await prisma.quoteRequest.update({ where: { quoteNumber: cancelledReference }, data: { status: CANCELLED, rejectedAt: new Date() } })
    await expectConflict(convertQuoteRequestToOrder(userA.id, cancelledReference, {}))

    // --- 9. A quotation completed by admin (not via conversion) cannot convert ---
    const adminCompletedReference = await createQuote(userA.id, 1)
    await priceQuote(adminCompletedReference, '1000.00')
    await updateAdminQuoteRequestStatus(adminCompletedReference, COMPLETED)
    await expectConflict(convertQuoteRequestToOrder(userA.id, adminCompletedReference, {}))

    // --- 10. Unverified customers cannot convert ---
    const unverifiedReference = await createQuote(userC.id, 1)
    await priceQuote(unverifiedReference, '1000.00')
    await expectHttpError(convertQuoteRequestToOrder(userC.id, unverifiedReference, {}), 403)

    // --- 11. Customer and admin serializers expose the converted order ---
    const customerView = await getCustomerQuoteRequest(reference, userA.id)
    if (customerView.status !== COMPLETED) throw new Error('Customer sees the wrong status after conversion.')
    if (customerView.convertedOrderNumber !== order.orderNumber) {
      throw new Error('Customer serializer does not expose the converted order number.')
    }
    if (customerView.fulfillmentMethod !== FulfillmentMethod.PICKUP) throw new Error('Customer serializer lost fulfillment method.')
    const adminView = await getAdminQuoteRequest(reference)
    if (adminView.status !== COMPLETED) throw new Error('Admin sees the wrong status after conversion.')
    if (adminView.convertedOrderNumber !== order.orderNumber) throw new Error('Admin serializer does not link the converted order.')
    if (adminView.fulfillmentMethod !== FulfillmentMethod.PICKUP) throw new Error('Admin serializer lost fulfillment method.')

    // --- 12. HTTP convert route (only when the API is reachable) ---
    let apiReachable = false
    try {
      const ready = await fetch(`${API_ORIGIN}/ready`)
      if (ready.ok) apiReachable = true
    } catch {
      apiReachable = false
    }
    if (apiReachable) {
      const httpReference = await createQuote(userA.id, 2)
      await priceQuote(httpReference, '3000.00')
      await acceptQuoteRequest(httpReference, userA.id)
      const authA = await loginCustomer({ email: customerEmailA, password: 'smoke-password-123' })
      const sessionA = `ayanfe_customer_session=${authA.token}`

      const unauth = await fetch(`${API_ORIGIN}/api/v1/quotes/${httpReference}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (unauth.status !== 401) throw new Error(`Unauthenticated convert returned ${unauth.status}.`)

      const convertRes = await fetch(`${API_ORIGIN}/api/v1/quotes/${httpReference}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionA },
        body: JSON.stringify({}),
      })
      const convertBody = await convertRes.json() as { success?: boolean; message?: string; data?: { order?: { orderNumber?: string; quoteNumber?: string | null } } }
      if (convertRes.status !== 201 || convertBody.success !== true) {
        throw new Error(`HTTP convert failed: ${convertRes.status} ${JSON.stringify(convertBody).slice(0, 200)}`)
      }
      if (convertBody.data?.order?.quoteNumber !== httpReference) throw new Error('HTTP convert order is not linked to the quotation.')

      const repeatRes = await fetch(`${API_ORIGIN}/api/v1/quotes/${httpReference}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionA },
        body: JSON.stringify({}),
      })
      if (repeatRes.status !== 200) throw new Error(`Repeated HTTP convert returned ${repeatRes.status}.`)

      const crossOwnerRes = await fetch(`${API_ORIGIN}/api/v1/quotes/${reference}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionA },
        body: JSON.stringify({}),
      })
      if (crossOwnerRes.status !== 200) throw new Error(`Cross-owner HTTP convert returned ${crossOwnerRes.status} (should be the owner's existing order).`)
      console.log('HTTP convert flow passed.')
    } else {
      console.log('Skipping HTTP convert flow (API not reachable).')
    }

    console.log('Quote conversion smoke test passed.')
  } finally {
    await prisma.order.deleteMany({ where: { userId: { in: createdUserIds } } })
    await prisma.quoteRequest.deleteMany({ where: { customerPhone: '+2348091110000' } })
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
    const smokeProducts = await prisma.product.findMany({
      where: { OR: [{ slug: { startsWith: 'smoke-low-stock-' } }, { slug: { startsWith: 'smoke-product-' } }] },
      select: { id: true },
    })
    await prisma.productStockAdjustment.deleteMany({
      where: { productId: { in: smokeProducts.map((p) => p.id) } },
    })
    await prisma.product.deleteMany({ where: { slug: { startsWith: 'smoke-low-stock-' } } })
    await prisma.product.deleteMany({ where: { slug: { startsWith: 'smoke-product-' } } })
    await prisma.category.deleteMany({ where: { slug: { startsWith: 'smoke-category-' } } })
    if (paymentSettingsCreated) {
      await prisma.paymentSettings.deleteMany({ where: { singletonKey: 'default', paymentMethod: 'BANK_TRANSFER', bankName: 'Smoke Bank' } })
    }
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