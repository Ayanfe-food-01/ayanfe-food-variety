// Phase 4 smoke: server-side Paystack payment verification.
// The Paystack HTTP calls (initialize + verify) are simulated so no external
// network or real card is needed; everything else (payments, orders, carts)
// runs against the real DB. Transient rows are cleaned up at the end.
import { PaymentMethod, Prisma, type Order, type Payment } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { prisma } from '../src/lib/prisma.js'
import { initializeOrderPayment, verifyOrderPayment } from '../src/modules/payments/payment.gateway.js'
import { checkoutCustomerCart } from '../src/modules/orders/order.service.js'
import { HttpError } from '../src/utils/http.js'

const prefix = 'test-paystack-verify'
const createdCheckoutKeys: string[] = []
const stockAdjustments = new Map<string, number>()
const createdUserIds: string[] = []

const assert = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

// ---- Mock the Paystack API ------------------------------------------------
type VerifyPayload = {
  status?: unknown
  message?: unknown
  data?: Record<string, unknown>
} & { responseStatus?: number }

let verifyResponse: VerifyPayload = { responseStatus: 404 }
let verifyCalls = 0
const seenInitRequests: Array<Record<string, unknown>> = []

const originalFetch = globalThis.fetch
;(globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)
  if (url.startsWith('https://api.paystack.co/transaction/initialize')) {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>
    seenInitRequests.push(body)
    return {
      ok: true,
      status: 200,
      json: async () => ({
        status: true,
        message: 'Authorization URL created',
        data: {
          authorization_url: 'https://checkout.paystack.com/mock-authorization',
          access_code: 'mock-access-code',
          reference: body.reference,
        },
      }),
    } as unknown as Response
  }
  if (url.startsWith('https://api.paystack.co/transaction/verify/')) {
    verifyCalls += 1
    return {
      ok: verifyResponse.responseStatus === 200,
      status: verifyResponse.responseStatus ?? 200,
      json: async () => ({
        status: verifyResponse.status ?? true,
        message: verifyResponse.message ?? 'Verification successful',
        data: verifyResponse.data,
      }),
    } as unknown as Response
  }
  return originalFetch(input, init)
}) as typeof fetch

const setVerifySuccess = (overrides: Record<string, unknown> = {}) => {
  verifyResponse = {
    responseStatus: 200,
    status: true,
    data: {
      status: 'success',
      amount: null as unknown as string,
      currency: 'NGN',
      paid_at: '2026-08-31T05:00:00.000Z',
      channel: 'card',
      ...overrides,
    },
  }
}

let failures = 0

const run = async (label: string, step: () => Promise<void>): Promise<void> => {
  try {
    await step()
    console.log(`ok - ${label}`)
  } catch (error) {
    failures += 1
    console.error(`FAIL - ${label}`)
    console.error(error)
  }
}

const expectFailure = async (label: string, fn: () => Promise<unknown>, status: number): Promise<void> => {
  await run(label, async () => {
    try {
      await fn()
      throw new Error(`expected HttpError ${status}`)
    } catch (error) {
      assert(error instanceof HttpError && error.statusCode === status, `expected ${status}, got ${error instanceof HttpError ? error.statusCode : 'non-Http'}`)
    }
  })
}

const nairaToKobo = (naira: string): string => new Prisma.Decimal(naira).mul(100).toFixed(0)

const main = async () => {
  const product = await prisma.product.findFirst({
    where: { isActive: true, stockQuantity: { gte: 20 }, category: { isActive: true } },
  })
  if (!product) {
    console.log('no active product with enough stock found; skipping smoke run')
    process.exit(0)
  }

  // -------------------------------------------------------------------------
  // Guest order: verify success, idempotency, mismatch and decline branches.
  // -------------------------------------------------------------------------
  const guestToken = randomUUID()
  const guestCheckoutKey = randomUUID()
  createdCheckoutKeys.push(guestCheckoutKey)
  let guestOrder!: Order
  await run('guest PAYSTACK order created (PENDING, no bank snapshot)', async () => {
    guestOrder = await checkoutCustomerCart(null, {
      checkoutKey: guestCheckoutKey,
      guestAccessToken: guestToken,
      cartItems: [{ productId: product!.id, productOptionId: null, quantity: 1 }],
      customerName: 'Verify Smoke Test',
      phone: '08000000000',
      email: 'verify-smoke@example.com',
      fulfillmentMethod: 'PICKUP',
      paymentMethod: PaymentMethod.PAYSTACK,
    })
    stockAdjustments.set(product!.id, (stockAdjustments.get(product!.id) ?? 0) + 1)
    const row = await prisma.order.findUnique({ where: { id: guestOrder.id } })
    assert(row!.paymentCartItemIds === null, 'guest orders never hold source cart ids')
    assert(row!.paymentConfirmedAt === null, 'paymentConfirmedAt must start null')
  })

  await expectFailure('verify without auth or guest token is refused', () => verifyOrderPayment({ orderId: guestOrder!.id }), 401)

  await expectFailure('verify with a wrong guest token is refused', () =>
    verifyOrderPayment({ orderId: guestOrder!.id, guestAccessToken: randomUUID() }), 404)

  const initialized = await initializeOrderPayment({ orderId: guestOrder!.id, guestAccessToken: guestToken })
  assert(initialized.status === 'PENDING', 'init must stay PENDING')

  await run('verify with unknown provider reference stays unconfirmed', async () => {
    verifyResponse = { responseStatus: 404, status: false, message: 'Transaction reference not found' }
    const before = verifyCalls
    const result = await verifyOrderPayment({ orderId: guestOrder!.id, guestAccessToken: guestToken })
    assert(result.status === 'PENDING', 'unknown reference must leave the record PENDING')
    assert(result.paymentStatus === 'PENDING', 'order must stay unpaid')
    assert(verifyCalls === before + 1, 'provider should have been asked once')
    const payment = await prisma.payment.findFirst({ where: { orderId: guestOrder!.id } })
    assert(payment!.status === 'PENDING', 'payment record must remain PENDING')
  })

  await run('abandoned provider status stays unconfirmed and retryable', async () => {
    verifyResponse = {
      responseStatus: 200,
      status: true,
      data: {
        status: 'abandoned',
        reference: initialized.providerReference,
        amount: nairaToKobo(guestOrder!.total.toString()),
        currency: 'NGN',
      },
    }
    const result = await verifyOrderPayment({ orderId: guestOrder!.id, guestAccessToken: guestToken })
    assert(result.status === 'PENDING' && result.paymentStatus === 'PENDING', 'abandoned must leave everything PENDING')
    const payment = await prisma.payment.findFirst({ where: { orderId: guestOrder!.id } })
    assert(payment!.status === 'PENDING', 'abandoned must not mark the payment FAILED')
  })

  await run('successful provider reply with wrong amount is rejected (422)', async () => {
    setVerifySuccess({
      reference: initialized.providerReference,
      amount: nairaToKobo(new Prisma.Decimal(guestOrder!.total.toString()).plus(500).toString()),
    })
    await expectFailure('amount mismatch', () => verifyOrderPayment({ orderId: guestOrder!.id, guestAccessToken: guestToken }), 422)
    const payment = await prisma.payment.findFirst({ where: { orderId: guestOrder!.id } })
    assert(payment!.status === 'PENDING', 'mismatched amount must never mark the payment paid')
    const row = await prisma.order.findUnique({ where: { id: guestOrder!.id } })
    assert(row!.paymentStatus === 'PENDING' && row!.paymentConfirmedAt === null, 'mismatched amount must never settle the order')
  })

  await run('successful provider reply with wrong currency is rejected (422)', async () => {
    setVerifySuccess({ reference: initialized.providerReference, currency: 'USD' })
    await expectFailure('currency mismatch', () => verifyOrderPayment({ orderId: guestOrder!.id, guestAccessToken: guestToken }), 422)
    const payment = await prisma.payment.findFirst({ where: { orderId: guestOrder!.id } })
    assert(payment!.status === 'PENDING', 'mismatched currency must never mark the payment paid')
  })

  await run('verified success marks payment SUCCESSFUL and order PAID', async () => {
    setVerifySuccess({ reference: initialized.providerReference, amount: nairaToKobo(guestOrder!.total.toString()) })
    const before = verifyCalls
    const result = await verifyOrderPayment({ orderId: guestOrder!.id, guestAccessToken: guestToken })
    assert(result.status === 'SUCCESSFUL', 'record should be SUCCESSFUL')
    assert(result.paymentStatus === 'PAID', 'order payment status should be PAID')
    assert(result.paidAt !== null, 'paidAt should be reported')
    assert(verifyCalls === before + 1, 'one provider verify call expected')
    const payment = await prisma.payment.findFirst({ where: { orderId: guestOrder!.id } })
    assert(payment!.status === 'SUCCESSFUL', 'payment record should be SUCCESSFUL')
    assert(payment!.completedAt !== null, 'payment should have a completion timestamp')
    const row = await prisma.order.findUnique({ where: { id: guestOrder!.id } })
    assert(row!.paymentStatus === 'PAID', 'order paymentStatus should be PAID')
    assert(row!.paymentConfirmedAt !== null, 'order paymentConfirmedAt should be set')
  })

  await run('repeated verify is idempotent and hits no provider call', async () => {
    const before = verifyCalls
    const result = await verifyOrderPayment({ orderId: guestOrder!.id, guestAccessToken: guestToken })
    assert(result.status === 'SUCCESSFUL' && result.paymentStatus === 'PAID', 'idempotent success')
    assert(verifyCalls === before, 'idempotent verify must not call the provider again')
  })

  // Bank-transfer orders have no online Payment record.
  const bankKey = randomUUID()
  createdCheckoutKeys.push(bankKey)
  let bankOrder!: Order
  await run('bank-transfer order has no online payment to verify', async () => {
    bankOrder = await checkoutCustomerCart(null, {
      checkoutKey: bankKey,
      guestAccessToken: randomUUID(),
      cartItems: [{ productId: product!.id, productOptionId: null, quantity: 1 }],
      customerName: 'Bank Verify Smoke',
      phone: '08000000001',
      email: 'bank-verify-smoke@example.com',
      fulfillmentMethod: 'PICKUP',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
    })
    stockAdjustments.set(product!.id, (stockAdjustments.get(product!.id) ?? 0) + 1)
    await expectFailure('no Payment record -> 404', () =>
      verifyOrderPayment({ orderId: bankOrder.id, guestAccessToken: randomUUID() }), 404)
  })

  // -------------------------------------------------------------------------
  // Failed attempt: payment marked FAILED, then a fresh init starts a new one.
  // -------------------------------------------------------------------------
  const retryToken = randomUUID()
  const retryKey = randomUUID()
  createdCheckoutKeys.push(retryKey)
  let retryOrder!: Order
  await run('failed attempt guest order created', async () => {
    retryOrder = await checkoutCustomerCart(null, {
      checkoutKey: retryKey,
      guestAccessToken: retryToken,
      cartItems: [{ productId: product!.id, productOptionId: null, quantity: 1 }],
      customerName: 'Retry Smoke',
      phone: '08000000002',
      email: 'retry-smoke@example.com',
      fulfillmentMethod: 'PICKUP',
      paymentMethod: PaymentMethod.PAYSTACK,
    })
    stockAdjustments.set(product!.id, (stockAdjustments.get(product!.id) ?? 0) + 1)
  })

  const firstAttempt = await initializeOrderPayment({ orderId: retryOrder!.id, guestAccessToken: retryToken })

  await run('provider failed status marks the attempt FAILED (order stays PENDING)', async () => {
    verifyResponse = {
      responseStatus: 200,
      status: true,
      data: { status: 'failed', reference: firstAttempt.providerReference, amount: nairaToKobo(retryOrder!.total.toString()), currency: 'NGN' },
    }
    const result = await verifyOrderPayment({ orderId: retryOrder!.id, guestAccessToken: retryToken })
    assert(result.status === 'FAILED', 'response should report FAILED')
    assert(result.paymentStatus === 'PENDING', 'order must stay PENDING on a failed attempt')
    const payment = await prisma.payment.findFirst({ where: { orderId: retryOrder!.id } })
    assert(payment!.status === 'FAILED', 'payment record should be FAILED')
  })

  await run('re-init after failure creates a fresh attempt (retry allowed)', async () => {
    const before = await prisma.payment.count({ where: { orderId: retryOrder!.id } })
    const second = await initializeOrderPayment({ orderId: retryOrder!.id, guestAccessToken: retryToken })
    const after = await prisma.payment.count({ where: { orderId: retryOrder!.id } })
    assert(after === before + 1, 'a fresh Payment row should be created after a failure')
    assert(second.providerReference !== firstAttempt.providerReference, 'a new provider reference is expected')
    setVerifySuccess({ reference: second.providerReference, amount: nairaToKobo(retryOrder!.total.toString()) })
    const result = await verifyOrderPayment({ orderId: retryOrder!.id, guestAccessToken: retryToken })
    assert(result.status === 'SUCCESSFUL' && result.paymentStatus === 'PAID', 'retry after failure can succeed')
  })

  // -------------------------------------------------------------------------
  // Authenticated PAYSTACK checkout keeps the cart until payment is confirmed.
  // -------------------------------------------------------------------------
  let cartUser!: { id: string }
  await run('authenticated PAYSTACK checkout defers cart release', async () => {
    cartUser = await prisma.user.create({
      data: {
        name: 'Verify Cart Smoke',
        email: `verify-cart-${randomUUID()}@example.com`,
        role: 'CUSTOMER',
        authProvider: 'PASSWORD',
        emailVerified: true,
        shoppingMode: 'RETAIL',
      },
    })
    createdUserIds.push(cartUser.id)
    const cart = await prisma.customerCart.create({ data: { userId: cartUser.id, mode: 'RETAIL' } })
    const cartItem = await prisma.customerCartItem.create({
      data: { cartId: cart.id, productId: product!.id, productOptionId: null, quantity: 2 },
    })

    const key = randomUUID()
    createdCheckoutKeys.push(key)
    const order = await checkoutCustomerCart(cartUser.id, {
      checkoutKey: key,
      customerName: 'Verify Cart Smoke',
      phone: '08000000003',
      email: 'verCart@example.com',
      fulfillmentMethod: 'PICKUP',
      paymentMethod: PaymentMethod.PAYSTACK,
      cartItems: [],
    })
    stockAdjustments.set(product!.id, (stockAdjustments.get(product!.id) ?? 0) + 2)
    assert(order.paymentMethod === 'PAYSTACK', 'order should be PAYSTACK')

    const itemAfter = await prisma.customerCartItem.findUnique({ where: { id: cartItem.id } })
    assert(Boolean(itemAfter), 'cart rows must survive a PAYSTACK checkout (not released yet)')
    const row = await prisma.order.findUnique({ where: { id: order.id } })
    assert(Array.isArray(row!.paymentCartItemIds), 'order should record the source cart ids')
    assert((row!.paymentCartItemIds as string[]).includes(cartItem.id), 'recorded cart ids should match')

    const init = await initializeOrderPayment({ orderId: order.id, authenticatedUserId: cartUser.id })
    setVerifySuccess({ reference: init.providerReference, amount: nairaToKobo(order.total.toString()) })
    const result = await verifyOrderPayment({ orderId: order.id, authenticatedUserId: cartUser.id })
    assert(result.status === 'SUCCESSFUL' && result.paymentStatus === 'PAID', 'auth payment should verify')

    const itemDeleted = await prisma.customerCartItem.findUnique({ where: { id: cartItem.id } })
    assert(itemDeleted === null, 'cart rows must be released only after payment is confirmed')
    const updatedRow = await prisma.order.findUnique({ where: { id: order.id } })
    assert(updatedRow!.paymentCartItemIds === null, 'paymentCartItemIds should be cleared after release')
  })

  // -------------------------------------------------------------------------
  // Authenticated BANK_TRANSFER checkout behaves as before: clears cart now.
  // -------------------------------------------------------------------------
  await run('authenticated bank checkout still clears the cart at order time', async () => {
    const bankUser = await prisma.user.create({
      data: {
        name: 'Verify Bank Cart Smoke',
        email: `verify-bank-cart-${randomUUID()}@example.com`,
        role: 'CUSTOMER',
        authProvider: 'PASSWORD',
        emailVerified: true,
        shoppingMode: 'RETAIL',
      },
    })
    createdUserIds.push(bankUser.id)
    const cart = await prisma.customerCart.create({ data: { userId: bankUser.id, mode: 'RETAIL' } })
    const cartItem = await prisma.customerCartItem.create({
      data: { cartId: cart.id, productId: product!.id, productOptionId: null, quantity: 1 },
    })
    const key = randomUUID()
    createdCheckoutKeys.push(key)
    await checkoutCustomerCart(bankUser.id, {
      checkoutKey: key,
      customerName: 'Verify Bank Cart Smoke',
      phone: '08000000004',
      email: 'verBankCart@example.com',
      fulfillmentMethod: 'PICKUP',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      cartItems: [],
    })
    stockAdjustments.set(product!.id, (stockAdjustments.get(product!.id) ?? 0) + 1)
    const gone = await prisma.customerCartItem.findUnique({ where: { id: cartItem.id } })
    assert(gone === null, 'bank checkout must clear cart rows immediately')
  })

  // -------------------------------------------------------------------------
  // Cleanup: restore stock, remove transient orders/users.
  // -------------------------------------------------------------------------
  const deleted = await prisma.order.deleteMany({ where: { checkoutKey: { in: createdCheckoutKeys } } })
  console.log(`cleaned ${deleted.count} transient order(s)`)

  for (const [productId, quantity] of stockAdjustments) {
    await prisma.product.updateMany({
      where: { id: productId },
      data: { stockQuantity: { increment: quantity } },
    })
  }

  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
  }

  const leftoverOrders = await prisma.order.count({ where: { checkoutKey: { in: createdCheckoutKeys } } })
  assert(leftoverOrders === 0, 'no transient orders should remain')

  console.log(failures === 0 ? '\nALL PAYSTACK VERIFY SMOKE CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})