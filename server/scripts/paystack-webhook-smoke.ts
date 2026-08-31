// Phase 5 smoke: Paystack webhook + payment reconciliation.
//
// Paystack HTTP calls (initialize + verify) are mocked; the webhook route,
// signature verification, and payment/order settlement run against real code
// and the real database. Transient rows are cleaned up at the end.
//
// Run with: npx tsx scripts/paystack-webhook-smoke.ts

import { PaymentMethod, Prisma, type Order } from '@prisma/client'
import { createHmac, randomUUID } from 'node:crypto'
import { env } from '../src/config/env.js'
import { prisma } from '../src/lib/prisma.js'

// Override the webhook secret so signature verification is testable.
const WEBHOOK_SECRET = 'smoke-test-webhook-secret-00000000000000000000000000000000'
env.payments.paystack.webhookSecret = WEBHOOK_SECRET

// --- Mock the Paystack API -------------------------------------------------

type MockResponse = { responseStatus: number; status?: unknown; message?: unknown; data?: Record<string, unknown> }

let verifyResponse: MockResponse = { responseStatus: 404 }
let verifyCalls = 0
let initCalls = 0

const originalFetch = globalThis.fetch
;(globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)
  if (url.startsWith('https://api.paystack.co/transaction/initialize')) {
    initCalls += 1
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>
    return {
      ok: true, status: 200,
      json: async () => ({
        status: true, message: 'Authorization URL created',
        data: { authorization_url: 'https://checkout.paystack.com/mock', access_code: 'mock', reference: body.reference },
      }),
    } as unknown as Response
  }
  if (url.startsWith('https://api.paystack.co/transaction/verify/')) {
    verifyCalls += 1
    return {
      ok: verifyResponse.responseStatus === 200, status: verifyResponse.responseStatus,
      json: async () => ({ status: verifyResponse.status ?? true, message: verifyResponse.message ?? 'ok', data: verifyResponse.data }),
    } as unknown as Response
  }
  return originalFetch(input, init)
}) as typeof fetch

const nairaToKobo = (naira: string): string => new Prisma.Decimal(naira).mul(100).toFixed(0)
const setVerifySuccess = (overrides: Record<string, unknown> = {}) => {
  verifyResponse = {
    responseStatus: 200, status: true,
    data: { status: 'success', amount: null as unknown, currency: 'NGN', paid_at: '2026-09-04T10:00:00.000Z', channel: 'card', ...overrides },
  }
}

// --- Test harness ----------------------------------------------------------

let failures = 0
const run = async (label: string, step: () => Promise<void>): Promise<void> => {
  try { await step(); console.log(`ok - ${label}`) }
  catch (error) { failures += 1; console.error(`FAIL - ${label}`); console.error(error) }
}

// --- Start the app ---------------------------------------------------------

const main = async () => {
  // Dynamic imports so env override is in effect when modules evaluate.
  const { app } = await import('../src/app.js')
  const { checkoutCustomerCart } = await import('../src/modules/orders/order.service.js')
  const { initializeOrderPayment } = await import('../src/modules/payments/payment.gateway.js')
  const { computePaystackWebhookSignature } = await import('../src/modules/payments/payment.webhook.js')

  const server = await new Promise<import('http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const addr = server.address()
  if (!addr || typeof addr === 'string') throw new Error('Server address unavailable')
  const baseUrl = `http://127.0.0.1:${addr.port}`

  const createdCheckoutKeys: string[] = []
  const stockAdjustments = new Map<string, number>()
  const createdUserIds: string[] = []

  const sign = (body: string): string =>
    computePaystackWebhookSignature(Buffer.from(body, 'utf8'), WEBHOOK_SECRET)

  const webhookPost = async (eventPayload: Record<string, unknown>, opts?: { signature?: string | null }): Promise<{ status: number; body: unknown }> => {
    const rawBody = JSON.stringify(eventPayload)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (opts?.signature === null) { /* no signature header */ }
    else if (opts?.signature !== undefined) { headers['x-paystack-signature'] = opts.signature }
    else { headers['x-paystack-signature'] = sign(rawBody) }
    const res = await fetch(`${baseUrl}/api/v1/payments/paystack/webhook`, { method: 'POST', headers, body: rawBody })
    const body = await res.json().catch(() => null)
    return { status: res.status, body }
  }

  // Helper to build a charge.success event body
  const chargeSuccess = (reference: string): Record<string, unknown> => ({
    event: 'charge.success',
    data: { reference, status: 'success', amount: 10000, currency: 'NGN', paid_at: '2026-09-04T10:00:00.000Z', channel: 'card' },
  })

  // Need a product for orders.
  const product = await prisma.product.findFirst({
    where: { isActive: true, stockQuantity: { gte: 20 }, category: { isActive: true } },
  })
  if (!product) {
    console.log('no active product with enough stock found; skipping smoke run')
    server.close(); process.exit(0)
  }

  // =========================================================================
  // 1. GUEST ORDER: customer never returns — webhook settles
  // =========================================================================
  const guestToken = randomUUID()
  const guestKey = randomUUID()
  createdCheckoutKeys.push(guestKey)
  let guestOrder!: Order
  await run('guest PAYSTACK order created (PENDING)', async () => {
    guestOrder = await checkoutCustomerCart(null, {
      checkoutKey: guestKey, guestAccessToken: guestToken,
      cartItems: [{ productId: product!.id, productOptionId: null, quantity: 1 }],
      customerName: 'Webhook Smoke', phone: '08000000000', email: 'webhook-smoke@example.com',
      fulfillmentMethod: 'PICKUP', paymentMethod: PaymentMethod.PAYSTACK,
    })
    stockAdjustments.set(product!.id, (stockAdjustments.get(product!.id) ?? 0) + 1)
    const row = await prisma.order.findUnique({ where: { id: guestOrder.id } })
    if (row!.paymentStatus !== 'PENDING') throw new Error('order must start PENDING')
  })

  const guestInit = await initializeOrderPayment({ orderId: guestOrder.id, guestAccessToken: guestToken })
  const guestRef = guestInit.providerReference

  // =========================================================================
  // 2. MISSING SIGNATURE → 401
  // =========================================================================
  await run('webhook without signature is refused', async () => {
    const res = await webhookPost(chargeSuccess(guestRef), { signature: null })
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`)
    const order = await prisma.order.findUnique({ where: { id: guestOrder.id } })
    if (order!.paymentStatus !== 'PENDING') throw new Error('must stay PENDING after missing sig')
  })

  // =========================================================================
  // 3. INVALID SIGNATURE → 401
  // =========================================================================
  await run('webhook with invalid signature is refused', async () => {
    const res = await webhookPost(chargeSuccess(guestRef), { signature: 'deadbeef'.repeat(8) })
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`)
    const order = await prisma.order.findUnique({ where: { id: guestOrder.id } })
    if (order!.paymentStatus !== 'PENDING') throw new Error('must stay PENDING after bad sig')
  })

  // =========================================================================
  // 4. UNKNOWN REFERENCE → 200 ignored
  // =========================================================================
  await run('webhook with unknown reference is acknowledged', async () => {
    const res = await webhookPost(chargeSuccess('pay-unknown-ref-00000000'))
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`)
    const order = await prisma.order.findUnique({ where: { id: guestOrder.id } })
    if (order!.paymentStatus !== 'PENDING') throw new Error('order must remain PENDING')
  })

  // =========================================================================
  // 5. AMOUNT MISMATCH → 200 ack, not settled
  // =========================================================================
  await run('webhook with correct ref but provider amount mismatch is not settled', async () => {
    setVerifySuccess({ reference: guestRef, amount: nairaToKobo(new Prisma.Decimal(guestOrder.total.toString()).plus(500).toString()) })
    const res = await webhookPost(chargeSuccess(guestRef))
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`)
    const order = await prisma.order.findUnique({ where: { id: guestOrder.id } })
    if (order!.paymentStatus !== 'PENDING') throw new Error('must not settle on amount mismatch')
    const payment = await prisma.payment.findFirst({ where: { orderId: guestOrder.id } })
    if (payment!.status !== 'PENDING') throw new Error('payment must remain PENDING on mismatch')
  })

  // =========================================================================
  // 6. CURRENCY MISMATCH → 200 ack, not settled
  // =========================================================================
  await run('webhook with correct ref but provider currency mismatch is not settled', async () => {
    setVerifySuccess({ reference: guestRef, currency: 'USD' })
    const res = await webhookPost(chargeSuccess(guestRef))
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`)
    const order = await prisma.order.findUnique({ where: { id: guestOrder.id } })
    if (order!.paymentStatus !== 'PENDING') throw new Error('must not settle on currency mismatch')
  })

  // =========================================================================
  // 7. UNSUPPORTED EVENT → 200 ignored
  // =========================================================================
  await run('webhook with unsupported event type is acknowledged', async () => {
    const rawBody = JSON.stringify({ event: 'transfer.success', data: { reference: guestRef } })
    const res = await webhookPost(JSON.parse(rawBody))
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`)
    const order = await prisma.order.findUnique({ where: { id: guestOrder.id } })
    if (order!.paymentStatus !== 'PENDING') throw new Error('must not settle on unsupported event')
  })

  // =========================================================================
  // 8. VALID WEBHOOK: customer never returns — order PAID
  // =========================================================================
  await run('valid webhook settles guest order (customer never returns scenario)', async () => {
    setVerifySuccess({ reference: guestRef, amount: nairaToKobo(guestOrder.total.toString()), currency: 'NGN' })
    const verifyBefore = verifyCalls
    const res = await webhookPost(chargeSuccess(guestRef))
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`)
    if (verifyCalls !== verifyBefore + 1) throw new Error('provider should have been asked once')
    const payment = await prisma.payment.findFirst({ where: { orderId: guestOrder.id } })
    if (payment!.status !== 'SUCCESSFUL') throw new Error('payment must be SUCCESSFUL')
    if (payment!.completedAt === null) throw new Error('payment must have completedAt')
    const order = await prisma.order.findUnique({ where: { id: guestOrder.id } })
    if (order!.paymentStatus !== 'PAID') throw new Error('order paymentStatus must be PAID')
    if (order!.paymentConfirmedAt === null) throw new Error('paymentConfirmedAt must be set')
  })

  // =========================================================================
  // 9. DUPLICATE WEBHOOK → 200 idempotent, no extra provider calls
  // =========================================================================
  await run('duplicate webhook is idempotent (no extra provider calls)', async () => {
    const verifyBefore = verifyCalls
    const res = await webhookPost(chargeSuccess(guestRef))
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`)
    if (verifyCalls !== verifyBefore) throw new Error('idempotent webhook must not call provider')
    const payment = await prisma.payment.findFirst({ where: { orderId: guestOrder.id } })
    if (payment!.status !== 'SUCCESSFUL') throw new Error('payment must stay SUCCESSFUL')
  })

  // =========================================================================
  // 10. FAILED ATTEMPT → webhook cannot resurrect
  // =========================================================================
  const failToken = randomUUID()
  const failKey = randomUUID()
  createdCheckoutKeys.push(failKey)
  let failOrder!: Order
  await run('guest order created for failed-attempt test', async () => {
    failOrder = await checkoutCustomerCart(null, {
      checkoutKey: failKey, guestAccessToken: failToken,
      cartItems: [{ productId: product!.id, productOptionId: null, quantity: 1 }],
      customerName: 'Webhook Fail', phone: '08000000001', email: 'webhook-fail@example.com',
      fulfillmentMethod: 'PICKUP', paymentMethod: PaymentMethod.PAYSTACK,
    })
    stockAdjustments.set(product!.id, (stockAdjustments.get(product!.id) ?? 0) + 1)
  })
  const failInit = await initializeOrderPayment({ orderId: failOrder.id, guestAccessToken: failToken })

  await run('provider failed marks attempt FAILED', async () => {
    setVerifySuccess({ reference: failInit.providerReference, status: 'failed', amount: nairaToKobo(failOrder.total.toString()) })
    const { verifyOrderPayment } = await import('../src/modules/payments/payment.gateway.js')
    const result = await verifyOrderPayment({ orderId: failOrder.id, guestAccessToken: failToken })
    if (result.status !== 'FAILED') throw new Error('should be FAILED')
    const payment = await prisma.payment.findFirst({ where: { orderId: failOrder.id } })
    if (payment!.status !== 'FAILED') throw new Error('payment record should be FAILED')
  })

  await run('webhook cannot resurrect a FAILED attempt', async () => {
    setVerifySuccess({ reference: failInit.providerReference, amount: nairaToKobo(failOrder.total.toString()), currency: 'NGN' })
    const res = await webhookPost(chargeSuccess(failInit.providerReference))
    if (res.status !== 200) throw new Error(`expected 200 ack, got ${res.status}`)
    const payment = await prisma.payment.findFirst({ where: { orderId: failOrder.id } })
    if (payment!.status !== 'FAILED') throw new Error('FAILED payment must remain FAILED')
    const order = await prisma.order.findUnique({ where: { id: failOrder.id } })
    if (order!.paymentStatus !== 'PENDING') throw new Error('order must stay PENDING')
  })

  // =========================================================================
  // 11. BANK-TRANSFER ORDER: unknown reference → 200 ack
  // =========================================================================
  const bankKey = randomUUID()
  createdCheckoutKeys.push(bankKey)
  let bankOrder!: Order
  await run('bank-transfer order has no Payment → webhook acked', async () => {
    bankOrder = await checkoutCustomerCart(null, {
      checkoutKey: bankKey, guestAccessToken: randomUUID(),
      cartItems: [{ productId: product!.id, productOptionId: null, quantity: 1 }],
      customerName: 'Webhook Bank', phone: '08000000002', email: 'webhook-bank@example.com',
      fulfillmentMethod: 'PICKUP', paymentMethod: PaymentMethod.BANK_TRANSFER,
    })
    stockAdjustments.set(product!.id, (stockAdjustments.get(product!.id) ?? 0) + 1)
    const res = await webhookPost(chargeSuccess(`pay-bank-${bankOrder.orderNumber}-fake`))
    if (res.status !== 200) throw new Error(`expected 200 ack, got ${res.status}`)
  })

  // =========================================================================
  // 12. AUTHENTICATED RETAIL ORDER → webhook settles without session
  // =========================================================================
  let authUser!: { id: string }
  await run('authenticated retail order settled by webhook (no session)', async () => {
    authUser = await prisma.user.create({
      data: {
        name: 'Webhook Auth', email: `webhook-auth-${randomUUID()}@example.com`,
        role: 'CUSTOMER', authProvider: 'PASSWORD', emailVerified: true, shoppingMode: 'RETAIL',
      },
    })
    createdUserIds.push(authUser.id)
    const cart = await prisma.customerCart.create({ data: { userId: authUser.id, mode: 'RETAIL' } })
    const cartItem = await prisma.customerCartItem.create({
      data: { cartId: cart.id, productId: product!.id, productOptionId: null, quantity: 1 },
    })
    const key = randomUUID()
    createdCheckoutKeys.push(key)
    const order = await checkoutCustomerCart(authUser.id, {
      checkoutKey: key, cartItems: [],
      customerName: 'Webhook Auth', phone: '08000000003', email: `webhook-auth-${authUser.id.slice(0,8)}@example.com`,
      fulfillmentMethod: 'PICKUP', paymentMethod: PaymentMethod.PAYSTACK,
    })
    stockAdjustments.set(product!.id, (stockAdjustments.get(product!.id) ?? 0) + 1)

    const init = await initializeOrderPayment({ orderId: order.id, authenticatedUserId: authUser.id })
    setVerifySuccess({ reference: init.providerReference, amount: nairaToKobo(order.total.toString()), currency: 'NGN' })
    const res = await webhookPost(chargeSuccess(init.providerReference))
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`)
    const row = await prisma.order.findUnique({ where: { id: order.id } })
    if (row!.paymentStatus !== 'PAID') throw new Error('order must be PAID')
    const payment = await prisma.payment.findFirst({ where: { orderId: order.id } })
    if (payment!.status !== 'SUCCESSFUL') throw new Error('payment must be SUCCESSFUL')
    // No session was provided to the webhook (server-to-server), confirming it works independently.
  })

  // =========================================================================
  // 13. WHOLESALE ORDER → webhook settles
  // =========================================================================
  await run('wholesale order settled by webhook', async () => {
    const wsUser = await prisma.user.create({
      data: {
        name: 'Webhook WS', email: `webhook-ws-${randomUUID()}@example.com`,
        role: 'CUSTOMER', authProvider: 'PASSWORD', emailVerified: true, shoppingMode: 'WHOLESALE',
      },
    })
    createdUserIds.push(wsUser.id)

    // Create a product with wholesale pricing tier (separate inserts to avoid
    // Prisma dual-relation confusion on WholesalePriceTier.productId).
    const activeCategory = await prisma.category.findFirst({ where: { isActive: true } })
    if (!activeCategory) throw new Error('no active category for wholesale fixture')
    const wsProduct = await prisma.product.create({
      data: {
        categoryId: activeCategory.id, name: `Webhook WS Product ${randomUUID().slice(0, 8)}`,
        slug: `webhook-ws-${randomUUID()}`, description: 'test', price: 1000, unit: 'pack', image: '',
        isActive: true, stockQuantity: 50,
      },
    })
    const wsOption = await prisma.productOption.create({
      data: { productId: wsProduct.id, label: 'Default', price: 1000, stockQuantity: 50, wholesaleMoq: 10 },
    })
    await prisma.wholesalePriceTier.create({
      data: { productId: wsProduct.id, productOptionId: wsOption.id, minQuantity: 10, price: 800 },
    })

    const wsCart = await prisma.customerCart.create({ data: { userId: wsUser.id, mode: 'WHOLESALE' } })
    await prisma.customerCartItem.create({
      data: { cartId: wsCart.id, productId: wsProduct.id, productOptionId: wsOption.id, quantity: 10 },
    })

    const key = randomUUID()
    createdCheckoutKeys.push(key)
    const order = await checkoutCustomerCart(wsUser.id, {
      checkoutKey: key, cartItems: [],
      customerName: 'Webhook WS', phone: '08000000004', email: `webhook-ws-${wsUser.id.slice(0,8)}@example.com`,
      fulfillmentMethod: 'PICKUP', paymentMethod: PaymentMethod.PAYSTACK,
    })
    stockAdjustments.set(wsProduct.id, (stockAdjustments.get(wsProduct.id) ?? 0) + 10)

    const init = await initializeOrderPayment({ orderId: order.id, authenticatedUserId: wsUser.id })
    setVerifySuccess({ reference: init.providerReference, amount: nairaToKobo(order.total.toString()), currency: 'NGN' })
    const res = await webhookPost(chargeSuccess(init.providerReference))
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`)
    const row = await prisma.order.findUnique({ where: { id: order.id } })
    if (row!.paymentStatus !== 'PAID') throw new Error('wholesale order must be PAID')
  })

  // =========================================================================
  // 14. RACE: two concurrent webhooks for same reference → both 200, consistent
  // =========================================================================
  await run('concurrent webhooks serialize safely (no duplicate state)', async () => {
    const raceToken = randomUUID()
    const raceKey = randomUUID()
    createdCheckoutKeys.push(raceKey)
    const raceOrder = await checkoutCustomerCart(null, {
      checkoutKey: raceKey, guestAccessToken: raceToken,
      cartItems: [{ productId: product!.id, productOptionId: null, quantity: 1 }],
      customerName: 'Webhook Race', phone: '08000000005', email: 'webhook-race@example.com',
      fulfillmentMethod: 'PICKUP', paymentMethod: PaymentMethod.PAYSTACK,
    })
    stockAdjustments.set(product!.id, (stockAdjustments.get(product!.id) ?? 0) + 1)

    const init = await initializeOrderPayment({ orderId: raceOrder.id, guestAccessToken: raceToken })
    setVerifySuccess({ reference: init.providerReference, amount: nairaToKobo(raceOrder.total.toString()), currency: 'NGN' })

    const eventBody = chargeSuccess(init.providerReference)
    const [res1, res2] = await Promise.all([
      webhookPost(eventBody),
      webhookPost(eventBody),
    ])
    if (res1.status !== 200 || res2.status !== 200) throw new Error(`both must be 200, got ${res1.status} / ${res2.status}`)
    const order = await prisma.order.findUnique({ where: { id: raceOrder.id } })
    if (order!.paymentStatus !== 'PAID') throw new Error('race order must be PAID')
    const payment = await prisma.payment.findFirst({ where: { orderId: raceOrder.id } })
    if (payment!.status !== 'SUCCESSFUL') throw new Error('race payment must be SUCCESSFUL')
  })

  // =========================================================================
  // 15. RETRY: transient verify failure then success
  // =========================================================================
  await run('webhook retries after transient provider failure', async () => {
    const retryToken = randomUUID()
    const retryKey = randomUUID()
    createdCheckoutKeys.push(retryKey)
    const retryOrder = await checkoutCustomerCart(null, {
      checkoutKey: retryKey, guestAccessToken: retryToken,
      cartItems: [{ productId: product!.id, productOptionId: null, quantity: 1 }],
      customerName: 'Webhook Retry', phone: '08000000006', email: 'webhook-retry@example.com',
      fulfillmentMethod: 'PICKUP', paymentMethod: PaymentMethod.PAYSTACK,
    })
    stockAdjustments.set(product!.id, (stockAdjustments.get(product!.id) ?? 0) + 1)

    const init = await initializeOrderPayment({ orderId: retryOrder.id, guestAccessToken: retryToken })

    // Simulate transient provider failure
    verifyResponse = { responseStatus: 500, status: false, message: 'Service temporarily unavailable' }
    const failRes = await webhookPost(chargeSuccess(init.providerReference))
    if (failRes.status < 200 || failRes.status >= 300) {
      // Express error middleware returns 502 for HttpError 502
      if (failRes.status !== 502) throw new Error(`expected 502 on provider failure, got ${failRes.status}`)
    }
    const paymentBefore = await prisma.payment.findFirst({ where: { orderId: retryOrder.id } })
    if (paymentBefore!.status !== 'PENDING') throw new Error('payment must remain PENDING after provider failure')

    // Now restore success and retry
    setVerifySuccess({ reference: init.providerReference, amount: nairaToKobo(retryOrder.total.toString()), currency: 'NGN' })
    const retryRes = await webhookPost(chargeSuccess(init.providerReference))
    if (retryRes.status !== 200) throw new Error(`expected 200 on retry, got ${retryRes.status}`)
    const order = await prisma.order.findUnique({ where: { id: retryOrder.id } })
    if (order!.paymentStatus !== 'PAID') throw new Error('order must be PAID after retry')
  })

  // =========================================================================
  // 16. ALREADY-SUCCESSFUL payment: webhook acked, no extra provider calls
  // =========================================================================
  await run('webhook for already-settled payment is idempotent (no extra verify)', async () => {
    const verifyBefore = verifyCalls
    const res = await webhookPost(chargeSuccess(guestRef))
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`)
    if (verifyCalls !== verifyBefore) throw new Error('must not call provider for already-settled')
    const payment = await prisma.payment.findFirst({ where: { orderId: guestOrder.id } })
    if (payment!.status !== 'SUCCESSFUL') throw new Error('must remain SUCCESSFUL')
  })

  // =========================================================================
  // Cleanup
  // =========================================================================
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

  // Clean up wholesale products (not in checkoutKeys list since they have their own)
  const leftoverOrders = await prisma.order.count({ where: { checkoutKey: { in: createdCheckoutKeys } } })
  if (leftoverOrders > 0) console.warn(`WARNING: ${leftoverOrders} leftover transient order(s)`)
  const leftoverPayments = await prisma.payment.count({ where: { order: { checkoutKey: { in: createdCheckoutKeys } } } })
  if (leftoverPayments > 0) console.warn(`WARNING: ${leftoverPayments} leftover payment(s)`)

  server.close()
  console.log(failures === 0 ? '\nALL PAYSTACK WEBHOOK SMOKE CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => { console.error(error); process.exit(1) })
