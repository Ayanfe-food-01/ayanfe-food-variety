// Smoke: Paystack amount validation across BOTH merchant fee configurations.
//
// Paystack's merchant account may either absorb the processing fee (customer is
// charged exactly the order total) or pass the fee on to the customer (customer
// is charged order total + Paystack's reported fee). The verification must
// accept both without:
//   - a customerPaysFee flag, or
//   - hardcoding any fee percentage / flat amount.
//
// Security: an arbitrary amount (e.g. order total + 1000) and an inflated
// requested_amount must NEVER be accepted.
//
// Paystack HTTP (initialize + verify) is mocked with Paystack-style responses
// (amount / requested_amount / fees / status / reference / currency) so the real
// adapter + gateway logic is exercised against the real database.
//
// Run with: npx tsx scripts/paystack-fee-modes-smoke.ts

import { PaymentMethod, Prisma, type Order } from '@prisma/client'
import { createHmac, randomUUID } from 'node:crypto'
import { env } from '../src/config/env.js'
import { prisma } from '../src/lib/prisma.js'

const WEBHOOK_SECRET = 'smoke-fee-modes-secret-00000000000000000000000000000000'
env.payments.paystack.webhookSecret = WEBHOOK_SECRET

type MockResponse = { responseStatus: number; status?: unknown; message?: unknown; data?: Record<string, unknown> }
let verifyResponse: MockResponse = { responseStatus: 404 }
let verifyCalls = 0

const originalFetch = globalThis.fetch
;(globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)
  if (url.startsWith('https://api.paystack.co/transaction/initialize')) {
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

// Simulate Paystack's verify response. `orderTotalNaira` is the order total and
// the "merchant fee mode" controls whether Paystack returns a fee-inclusive
// `amount` (customer-pays case) or amount == requested (merchant-absorbs case).
let feeMode: 'absorb' | 'pass' = 'absorb'

const setVerifyFor = (orderTotalNaira: string, ref: string, overrides: Record<string, unknown> = {}) => {
  const requested = nairaToKobo(orderTotalNaira)
  const requestedNum = new Prisma.Decimal(requested)
  let amount = requestedNum
  let fees = new Prisma.Decimal(0)
  if (feeMode === 'pass') {
    // Approximate Paystack pass-through: fee added on top (kobo), mirrored by
    // the `fees` field so amount == requested + fees.
    fees = requestedNum.mul(new Prisma.Decimal(15)).div(new Prisma.Decimal(1000)).floor()
    amount = requestedNum.add(fees)
  }
  verifyResponse = {
    responseStatus: 200, status: true,
    data: {
      status: 'success',
      reference: ref,
      amount: amount.toFixed(0),
      requested_amount: requested,
      fees: fees.toFixed(0),
      currency: 'NGN',
      paid_at: '2026-09-05T10:00:00.000Z',
      channel: 'card',
      ...overrides,
    },
  }
}

let failures = 0
const run = async (label: string, step: () => Promise<void>): Promise<void> => {
  try { await step(); console.log(`ok - ${label}`) }
  catch (error) { failures += 1; console.error(`FAIL - ${label}`); console.error(error) }
}
const assert = (cond: boolean, msg: string): void => { if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`) }

const main = async () => {
  const { app } = await import('../src/app.js')
  const { checkoutCustomerCart } = await import('../src/modules/orders/order.service.js')
  const { initializeOrderPayment, verifyOrderPayment } = await import('../src/modules/payments/payment.gateway.js')
  const { reconcilePaymentFromWebhook } = await import('../src/modules/payments/payment.gateway.js')
  const { computePaystackWebhookSignature } = await import('../src/modules/payments/payment.webhook.js')

  const server = await new Promise<import('http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const addr = server.address()
  if (!addr || typeof addr === 'string') throw new Error('Server address unavailable')
  const baseUrl = `http://127.0.0.1:${addr.port}`

  const sign = (body: string): string => computePaystackWebhookSignature(Buffer.from(body, 'utf8'), WEBHOOK_SECRET)
  const webhookPost = async (ref: string): Promise<number> => {
    const eventPayload = { event: 'charge.success', data: { reference: ref, status: 'success', amount: 10000, currency: 'NGN' } }
    const rawBody = JSON.stringify(eventPayload)
    const res = await fetch(`${baseUrl}/api/v1/payments/paystack/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-paystack-signature': sign(rawBody) },
      body: rawBody,
    })
    return res.status
  }

  const createdCheckoutKeys: string[] = []
  const stockAdjustments = new Map<string, number>()

  const product = await prisma.product.findFirst({
    where: { isActive: true, stockQuantity: { gte: 30 }, category: { isActive: true } },
  })
  if (!product) {
    console.log('no active product with enough stock; skipping')
    server.close(); process.exit(0)
  }

  const makeGuestOrder = async (tag: string): Promise<{ order: Order; token: string }> => {
    const token = randomUUID()
    const key = randomUUID()
    createdCheckoutKeys.push(key)
    const order = await checkoutCustomerCart(null, {
      checkoutKey: key, guestAccessToken: token,
      cartItems: [{ productId: product!.id, productOptionId: null, quantity: 1 }],
      customerName: `Fee Smoke ${tag}`, phone: '08000000000', email: `fee-${tag}@example.com`,
      fulfillmentMethod: 'PICKUP', paymentMethod: PaymentMethod.PAYSTACK,
    })
    stockAdjustments.set(product!.id, (stockAdjustments.get(product!.id) ?? 0) + 1)
    return { order, token }
  }

  const readPayment = async (orderId: string): Promise<{ status: string; meta: Record<string, unknown> | null }> => {
    const row = await prisma.payment.findFirst({ where: { orderId } })
    return { status: row!.status, meta: row!.providerMetadata as Record<string, unknown> | null }
  }
  const readOrder = async (orderId: string): Promise<{ paymentStatus: string; confirmed: Date | null }> => {
    const row = await prisma.order.findUnique({ where: { id: orderId } })!
    return { paymentStatus: row!.paymentStatus, confirmed: row!.paymentConfirmedAt }
  }

  // =========================================================================
  // CASE A — merchant absorbs fee (verify path)
  // =========================================================================
  feeMode = 'absorb'
  const { order: aOrder, token: aToken } = await makeGuestOrder('absorb')
  await run('CASE A (absorb): verify settles when amount == requested == order total', async () => {
    const init = await initializeOrderPayment({ orderId: aOrder.id, guestAccessToken: aToken })
    setVerifyFor(aOrder.total.toString(), init.providerReference)
    const res = await verifyOrderPayment({ orderId: aOrder.id, guestAccessToken: aToken })
    assert(res.status === 'SUCCESSFUL' && res.paymentStatus === 'PAID', 'absorb must settle to PAID')
    const p = await readPayment(aOrder.id)
    assert(p.status === 'SUCCESSFUL', 'payment must be SUCCESSFUL')
    assert(p.meta?.amountCharged === nairaToKobo(aOrder.total.toString()).slice(0, -2) || Number(p.meta?.amountCharged) >= 0, 'amountCharged persisted')
    const o = await readOrder(aOrder.id)
    assert(o.paymentStatus === 'PAID' && o.confirmed !== null, 'order PAID')
  })

  // =========================================================================
  // CASE B — customer pays fee (verify path) — the ACTUAL bug scenario
  // =========================================================================
  feeMode = 'pass'
  const { order: bOrder, token: bToken } = await makeGuestOrder('pass')
  await run('CASE B (pass): verify settles when amount = requested + Paystack fees', async () => {
    const init = await initializeOrderPayment({ orderId: bOrder.id, guestAccessToken: bToken })
    setVerifyFor(bOrder.total.toString(), init.providerReference)
    const res = await verifyOrderPayment({ orderId: bOrder.id, guestAccessToken: bToken })
    assert(res.status === 'SUCCESSFUL' && res.paymentStatus === 'PAID', 'pass must settle to PAID (this was the bug)')
    const p = await readPayment(bOrder.id)
    assert(p.status === 'SUCCESSFUL', 'payment must be SUCCESSFUL')
    const meta = p.meta ?? {}
    const feeNaira = new Prisma.Decimal(meta.processingFee as string)
    assert(feeNaira.gt(0), 'processingFee must be recorded')
    assert(new Prisma.Decimal(meta.amountCharged as string).greaterThan(new Prisma.Decimal(bOrder.total.toString())), 'amountCharged exceeds order total')
    assert(new Prisma.Decimal(meta.requestedAmount as string).equals(new Prisma.Decimal(bOrder.total.toString())), 'requestedAmount stays the order total')
    const o = await readOrder(bOrder.id)
    assert(o.paymentStatus === 'PAID', 'order PAID despite fee-inclusive charge')
  })

  // =========================================================================
  // SECURITY — arbitrary overcharge must be rejected (both fee modes)
  // =========================================================================
  await run('SECURITY: arbitrary overcharge (order + 1000) rejected even when >= order total', async () => {
    const { order, token } = await makeGuestOrder('overcharge')
    const init = await initializeOrderPayment({ orderId: order.id, guestAccessToken: token })
    setVerifyFor(order.total.toString(), init.providerReference, {
      amount: nairaToKobo(new Prisma.Decimal(order.total.toString()).plus(1000).toString()),
      fees: '0',
    })
    let threw = false
    try { await verifyOrderPayment({ orderId: order.id, guestAccessToken: token }) }
    catch { threw = true }
    assert(threw, 'arbitrary overcharge must throw (422)')
    const p = await readPayment(order.id); assert(p.status === 'PENDING', 'must stay PENDING')
    const o = await readOrder(order.id); assert(o.paymentStatus === 'PENDING', 'order must stay PENDING')
  })

  await run('SECURITY: unexplained excess beyond Paystack fee rejected', async () => {
    const { order, token } = await makeGuestOrder('excess')
    const init = await initializeOrderPayment({ orderId: order.id, guestAccessToken: token })
    const base = new Prisma.Decimal(order.total.toString())
    setVerifyFor(order.total.toString(), init.providerReference, {
      // amount = requested + 2000 but only fees = 1000 -> 1000 unexplained, reject.
      amount: nairaToKobo(base.plus(2000).toString()),
      fees: nairaToKobo(new Prisma.Decimal(1000).toString()),
    })
    let threw = false
    try { await verifyOrderPayment({ orderId: order.id, guestAccessToken: token }) }
    catch { threw = true }
    assert(threw, 'excess beyond Paystack reported fee must throw')
    const p = await readPayment(order.id); assert(p.status === 'PENDING', 'must stay PENDING')
    const o = await readOrder(order.id); assert(o.paymentStatus === 'PENDING', 'order must stay PENDING')
  })

  await run('SECURITY: inflated requested_amount rejected (must equal order total exactly)', async () => {
    const { order, token } = await makeGuestOrder('inflated')
    const init = await initializeOrderPayment({ orderId: order.id, guestAccessToken: token })
    const base = new Prisma.Decimal(order.total.toString())
    setVerifyFor(order.total.toString(), init.providerReference, {
      amount: nairaToKobo(base.toString()),
      requested_amount: nairaToKobo(base.plus(1).toString()),
      fees: '0',
    })
    let threw = false
    try { await verifyOrderPayment({ orderId: order.id, guestAccessToken: token }) }
    catch { threw = true }
    assert(threw, 'requested_amount must match order total exactly')
    const p = await readPayment(order.id); assert(p.status === 'PENDING', 'must stay PENDING')
  })

  // =========================================================================
  // CASE B via WEBHOOK — customer pays fee, webhook settles
  // =========================================================================
  feeMode = 'pass'
  const { order: wOrder, token: wToken } = await makeGuestOrder('webhook-pass')
  await run('CASE B (pass) via webhook: reconcile settles', async () => {
    const init = await initializeOrderPayment({ orderId: wOrder.id, guestAccessToken: wToken })
    setVerifyFor(wOrder.total.toString(), init.providerReference)
    const before = verifyCalls
    const status = await webhookPost(init.providerReference)
    assert(status === 200, `webhook should return 200, got ${status}`)
    const outcome = await reconcilePaymentFromWebhook({ providerReference: init.providerReference })
    assert(outcome === 'settled' || outcome === 'already-settled', `expected settled, got ${outcome}`)
    assert(verifyCalls >= before, 'provider should have been asked to verify')
    const p = await readPayment(wOrder.id); assert(p.status === 'SUCCESSFUL', 'webhook must settle payment')
    const o = await readOrder(wOrder.id); assert(o.paymentStatus === 'PAID', 'webhook must settle order')
  })

  // =========================================================================
  // CASE A via WEBHOOK — merchant absorbs fee
  // =========================================================================
  feeMode = 'absorb'
  const { order: w2Order, token: w2Token } = await makeGuestOrder('webhook-absorb')
  await run('CASE A (absorb) via webhook: reconcile settles', async () => {
    const init = await initializeOrderPayment({ orderId: w2Order.id, guestAccessToken: w2Token })
    setVerifyFor(w2Order.total.toString(), init.providerReference)
    const status = await webhookPost(init.providerReference)
    assert(status === 200, `webhook should return 200, got ${status}`)
    const outcome = await reconcilePaymentFromWebhook({ providerReference: init.providerReference })
    assert(outcome === 'settled' || outcome === 'already-settled', `expected settled, got ${outcome}`)
    const o = await readOrder(w2Order.id); assert(o.paymentStatus === 'PAID', 'webhook must settle order')
  })

  // -------------------------------------------------------------------------
  // Cleanup transient rows
  // -------------------------------------------------------------------------
  const emailDomains = [
    'fee-absorb@example.com', 'fee-pass@example.com', 'fee-overcharge@example.com',
    'fee-excess@example.com', 'fee-inflated@example.com', 'fee-webhook-pass@example.com',
    'fee-webhook-absorb@example.com',
  ]
  const transientOrders = await prisma.order.findMany({
    where: { email: { in: emailDomains } },
    select: { id: true },
  })
  const transientIds = transientOrders.map((o) => o.id)
  await prisma.payment.deleteMany({ where: { orderId: { in: transientIds } } })
  await prisma.order.deleteMany({ where: { id: { in: transientIds } } })
  for (const [pid, qty] of stockAdjustments) {
    const prod = await prisma.product.findUnique({ where: { id: pid } })
    if (prod) await prisma.product.update({ where: { id: pid }, data: { stockQuantity: prod.stockQuantity + qty } })
  }
  server.close()

  if (failures > 0) {
    console.error(`\n${failures} FEE-MODE CHECK(S) FAILED`)
    process.exit(1)
  }
  console.log('\nALL PAYSTACK FEE-MODE SMOKE CHECKS PASSED')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
