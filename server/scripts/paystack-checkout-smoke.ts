// Phase 3 smoke: PAYSTACK checkout availability + order creation + init flow.
// The Paystack HTTP call is simulated so no external network or real card is
// needed; everything else (orders, payment records) runs against the real DB.
// Transient rows are cleaned up at the end.
import { PaymentMethod, type Payment } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { prisma } from '../src/lib/prisma.js'
import { initializeOrderPayment } from '../src/modules/payments/payment.gateway.js'
import { checkoutCustomerCart } from '../src/modules/orders/order.service.js'
import { getPublicStoreSettings } from '../src/modules/settings/settings.service.js'
import { HttpError } from '../src/utils/http.js'

const prefix = 'test-paystack'
const createdCheckoutKeys: string[] = []

const assert = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

// ---- Mock the Paystack initialize call ------------------------------------
const seenRequests: Array<Record<string, unknown>> = []
const originalFetch = globalThis.fetch

;(globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)
  if (!url.startsWith('https://api.paystack.co/transaction/initialize')) {
    return originalFetch(input, init)
  }
  const body = JSON.parse(String(init?.body)) as Record<string, unknown>
  seenRequests.push(body)
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
}) as typeof fetch

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

const main = async () => {
  await run('public store settings include PAYSTACK', async () => {
    const settings = await getPublicStoreSettings()
    const paystack = settings.paymentMethods.find((method) => method.paymentMethod === PaymentMethod.PAYSTACK)
    assert(Boolean(paystack), 'PAYSTACK should be listed as an available method')
    assert(paystack!.isActive, 'PAYSTACK should be active')
    const bank = settings.paymentMethods.find((method) => method.paymentMethod === PaymentMethod.BANK_TRANSFER)
    assert(Boolean(bank), 'BANK_TRANSFER should still be listed')
  })

  const product = await prisma.product.findFirst({
    where: { isActive: true, stockQuantity: { gte: 20 }, category: { isActive: true } },
  })
  if (!product) {
    console.log('no active product with enough stock found; skipping smoke run')
    process.exit(0)
  }
  const guestToken = randomUUID()
  const checkoutKey = randomUUID()
  createdCheckoutKeys.push(checkoutKey)

  // Guest PAYSTACK order: stored with paymentMethod PAYSTACK and no bank snapshot.
  let orderId = ''
  let orderTotal = ''
  await run('guest checkout stores PAYSTACK without bank snapshot', async () => {
    const order = await checkoutCustomerCart(null, {
      checkoutKey,
      guestAccessToken: guestToken,
      cartItems: [{ productId: product!.id, productOptionId: null, quantity: 1 }],
      customerName: 'Paystack Smoke Test',
      phone: '08000000000',
      email: 'paystack-smoke@example.com',
      fulfillmentMethod: 'PICKUP',
      paymentMethod: PaymentMethod.PAYSTACK,
    })
    orderId = order.id
    orderTotal = order.total
    assert(order.paymentMethod === 'PAYSTACK', 'order paymentMethod should be PAYSTACK')
    assert(order.payment === null, 'PAYSTACK orders must not carry a bank snapshot')
    assert(Number(order.total) > 0, 'order total should be positive')
  })

  await run('foreign callback origin is rejected', async () => {
    try {
      await initializeOrderPayment({
        orderId,
        guestAccessToken: guestToken,
        callbackUrl: 'https://evil.example.com/order-confirmation/TST0001',
      })
      throw new Error('expected a 400 rejection')
    } catch (error) {
      assert(error instanceof HttpError && error.statusCode === 400, 'foreign origin should be rejected with 400')
    }
  })

  await run('init forwards whitelisted callback and creates PENDING record', async () => {
    const callbackUrl = `http://localhost:5000/order-confirmation/TST0001?access=${guestToken}`
    const payment = await initializeOrderPayment({ orderId, guestAccessToken: guestToken, callbackUrl })
    assert(payment.provider === 'PAYSTACK', 'provider should be PAYSTACK')
    assert(payment.authorizationUrl === 'https://checkout.paystack.com/mock-authorization', 'authorizationUrl should come from the provider')
    assert(payment.status === 'PENDING', 'record must stay PENDING after init (redirect != confirmed)')
    assert(payment.amount === orderTotal, 'amount should match the server order total')
    const record = await prisma.payment.findFirst({ where: { orderId } })
    assert(Boolean(record), 'a Payment row should exist')
    assert(record!.providerReference === payment.providerReference, 'providerReference should match')
    const metadata = record!.providerMetadata as Record<string, unknown>
    assert(metadata.authorizationUrl === payment.authorizationUrl, 'metadata should store the authorization url')
    const request = seenRequests.find((entry) => entry.reference === payment.providerReference)
    assert(Boolean(request), 'a provider initialize request should have been sent')
    assert(request!.callback_url === callbackUrl, 'callback_url should be forwarded to the provider')
    assert(Number(request!.amount) > 0, 'amount should be a positive kobo integer')
  })

  await run('re-init reuses the live PENDING attempt', async () => {
    const before = await prisma.payment.count({ where: { orderId } })
    const first = await prisma.payment.findFirst({ where: { orderId } })
    const payment = await initializeOrderPayment({ orderId, guestAccessToken: guestToken, callbackUrl: 'http://localhost:5000/order-confirmation/TST0001' })
    const after = await prisma.payment.count({ where: { orderId } })
    assert(after === before, 're-init must not create a second Payment row')
    assert(payment.providerReference === (first as Payment).providerReference, 'reused reference should match')
  })

  await run('bank transfer order still snapshots bank details', async () => {
    const bankKey = randomUUID()
    createdCheckoutKeys.push(bankKey)
    const order = await checkoutCustomerCart(null, {
      checkoutKey: bankKey,
      guestAccessToken: randomUUID(),
      cartItems: [{ productId: product!.id, productOptionId: null, quantity: 1 }],
      customerName: 'Bank Smoke Test',
      phone: '08000000000',
      email: 'bank-smoke@example.com',
      fulfillmentMethod: 'PICKUP',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
    })
    const snapshot = await prisma.orderPayment.findUnique({ where: { orderId: order.id } })
    assert(Boolean(snapshot), 'bank order should have an OrderPayment snapshot row')
    assert(snapshot!.paymentMethod === PaymentMethod.BANK_TRANSFER, 'snapshot should be BANK_TRANSFER')
  })

  const deleted = await prisma.order.deleteMany({ where: { checkoutKey: { in: createdCheckoutKeys } } })
  console.log(`cleaned ${deleted.count} transient order(s)`)

  const leftover = await prisma.order.count({ where: { checkoutKey: { in: createdCheckoutKeys } } })
  assert(leftover === 0, 'no transient orders should remain')

  console.log(failures === 0 ? '\nALL PAYSTACK CHECKOUT SMOKE CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})