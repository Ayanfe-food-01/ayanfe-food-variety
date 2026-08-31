import { createHmac } from 'node:crypto'
import { OrderStatus, PaymentMethod, PaymentStatus, UserRole } from '@prisma/client'
import { app } from '../src/app.js'
import { env } from '../src/config/env.js'
import { prisma, closeDatabase } from '../src/lib/prisma.js'
import { hashPassword } from '../src/modules/auth/auth.service.js'

const CUSTOMER_SESSION_COOKIE = 'ayanfe_customer_session'
const slug = `review-http-smoke-${Date.now().toString(36)}`
const ALICE_COOKIE = `smoke-alice-${slug}`
const BOB_COOKIE = `smoke-bob-${slug}`

const randomOrderNumber = () => `AFV-2026-${String(100000 + Math.floor(Math.random() * 900000))}`

const expectStatus = (actual: number, expected: number, label: string) => {
  if (actual !== expected) {
    throw new Error(`${label}: expected status ${expected}, received ${actual}.`)
  }
}

async function main() {
  const createdReviewIds: string[] = []
  const createdOrderIds: string[] = []
  const createdSessionIds: string[] = []
  const createdUserIds: string[] = []
  const createdProductIds: string[] = []
  let categoryId = ''
  let server: ReturnType<typeof app.listen> | null = null
  let aliceId = ''
  let bobId = ''
  let productA = ''
  let productB = ''
  let itemA = ''
  let itemB = ''
  let itemC = ''
  let itemD = ''
  let aliceOrderNumber = ''
  let pendingOrderNumber = ''
  let bobOrderNumber = ''

  const baseUrl = () => `http://127.0.0.1:${(server?.address() as { port: number }).port}/api/v1`
  const requestAs = async (
    cookie: string | undefined,
    path: string,
    init?: { method?: string; body?: unknown },
  ): Promise<{ status: number; body: any }> => {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (cookie) headers.Cookie = cookie
    if (init?.body !== undefined) headers['Content-Type'] = 'application/json'
    const response = await fetch(`${baseUrl()}${path}`, {
      method: init?.method ?? 'GET',
      headers,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
    let body: any = null
    try {
      body = await response.json()
    } catch {
      body = null
    }
    return { status: response.status, body }
  }

  const createSessionToken = (rawToken: string): string =>
    createHmac('sha256', env.sessionSecret).update(rawToken).digest('hex')

  try {
    // Boot the real API on an ephemeral port and hit it over HTTP.
    server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
    })

    const category = await prisma.category.create({
      data: { name: `Smoke Review Cat ${slug}`, slug: `smoke-review-cat-${slug}` },
    })
    categoryId = category.id

    const createProduct = async (name: string, slugName: string) => {
      const product = await prisma.product.create({
        data: {
          categoryId,
          name,
          slug: slugName,
          description: 'Smoke fixture',
          price: 1000,
          deliveryFee: 0,
          stockQuantity: 20,
          unit: 'bag',
          image: '',
        },
      })
      createdProductIds.push(product.id)
      return product
    }
    productA = (await createProduct(`Smoke Product A ${slug}`, `smoke-product-a-${slug}`)).id
    productB = (await createProduct(`Smoke Product B ${slug}`, `smoke-product-b-${slug}`)).id

    const createCustomer = async (name: string, email: string) => {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash: await hashPassword('smoke-password-123'),
          role: UserRole.CUSTOMER,
          emailVerified: true,
        },
      })
      createdUserIds.push(user.id)
      return user
    }
    const alice = await createCustomer('Alice Smoke', `${slug}-alice@smoke.local`)
    const bob = await createCustomer('Bob Smoke', `${slug}-bob@smoke.local`)
    aliceId = alice.id
    bobId = bob.id

    const createSession = async (userId: string, rawToken: string) => {
      const session = await prisma.customerSession.create({
        data: {
          userId,
          tokenHash: createSessionToken(rawToken),
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        },
      })
      createdSessionIds.push(session.id)
    }
    await createSession(alice.id, ALICE_COOKIE)
    await createSession(bob.id, BOB_COOKIE)

    const aliceCookie = `${CUSTOMER_SESSION_COOKIE}=${ALICE_COOKIE}`
    const bobCookie = `${CUSTOMER_SESSION_COOKIE}=${BOB_COOKIE}`

    const createOrder = async (
      userId: string,
      orderNumber: string,
      orderStatus: OrderStatus,
      paymentStatus: PaymentStatus,
      items: Array<{ productId: string; productName: string; quantity: number }>,
    ) => {
      const order = await prisma.order.create({
        data: {
          orderNumber,
          userId,
          customerName: 'Smoke Customer',
          phone: '+2348091112223',
          deliveryAddress: 'Smoke address',
          city: 'Lagos',
          subtotal: 2000,
          deliveryFee: 0,
          total: 2000,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          paymentStatus,
          orderStatus,
          orderItems: {
            create: items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              unitPrice: 1000,
              quantity: item.quantity,
              subtotal: 1000 * item.quantity,
              deliveryFee: 0,
            })),
          },
        },
        select: { id: true, orderItems: { select: { id: true } } },
      })
      createdOrderIds.push(order.id)
      return order
    }

    // Alice: delivered + paid order (qualifies) with two items.
    aliceOrderNumber = randomOrderNumber()
    const aliceOrder = await createOrder(alice.id, aliceOrderNumber, OrderStatus.DELIVERED, PaymentStatus.PAID, [
      { productId: productA, productName: 'Smoke Product A', quantity: 2 },
      { productId: productB, productName: 'Smoke Product B', quantity: 1 },
    ])
    itemA = aliceOrder.orderItems[0].id
    itemB = aliceOrder.orderItems[1].id

    // Alice: ordered but not delivered (not qualifying), same product again.
    pendingOrderNumber = randomOrderNumber()
    const pendingOrder = await createOrder(alice.id, pendingOrderNumber, OrderStatus.ORDER_PLACED, PaymentStatus.PAID, [
      { productId: productA, productName: 'Smoke Product A', quantity: 1 },
    ])
    itemC = pendingOrder.orderItems[0].id

    // Bob: delivered + paid order with product A.
    bobOrderNumber = randomOrderNumber()
    const bobOrder = await createOrder(bob.id, bobOrderNumber, OrderStatus.DELIVERED, PaymentStatus.PAID, [
      { productId: productA, productName: 'Smoke Product A', quantity: 1 },
    ])
    itemD = bobOrder.orderItems[0].id

    // --- Authentication is required for both endpoints ---
    const anonEligibility = await requestAs(undefined, `/orders/${aliceOrderNumber}/review-eligibility`)
    expectStatus(anonEligibility.status, 401, 'Unauthenticated eligibility request')
    const anonSubmit = await requestAs(undefined, `/orders/${aliceOrderNumber}/reviews`, {
      method: 'POST',
      body: { orderItemId: itemA, rating: 5, content: 'A valid-length review text follows.' },
    })
    expectStatus(anonSubmit.status, 401, 'Unauthenticated review submission')

    // --- WAF: unauthenticated access never leaks order data ---
    if (anonEligibility.body?.data) throw new Error('Unauthenticated request returned order data.')

    // --- Alice sees eligibility for her delivered order ---
    const aliceEligibility = await requestAs(aliceCookie, `/orders/${aliceOrderNumber}/review-eligibility`)
    expectStatus(aliceEligibility.status, 200, 'Alice eligibility for her delivered order')
    const items = aliceEligibility.body.data.eligibility.items
    const a = items.find((item: { id: string }) => item.id === itemA)
    const b = items.find((item: { id: string }) => item.id === itemB)
    if (!a?.canReview || !b?.canReview) throw new Error('Eligible items were not flagged as reviewable.')
    if (a.reviewed || b.reviewed) throw new Error('Fresh items should not already be reviewed.')

    // --- Alice's undelivered order items are not reviewable (but still visible) ---
    const pendingEligibility = await requestAs(aliceCookie, `/orders/${pendingOrderNumber}/review-eligibility`)
    expectStatus(pendingEligibility.status, 200, 'Alice eligibility for her undelivered order')
    const c = pendingEligibility.body.data.eligibility.items.find((item: { id: string }) => item.id === itemC)
    if (c?.canReview !== false) throw new Error('Undelivered order item must not be reviewable.')

    // --- Bob cannot read or review Alice's order ---
    const bobRead = await requestAs(bobCookie, `/orders/${aliceOrderNumber}/review-eligibility`)
    expectStatus(bobRead.status, 404, 'Bob reading Alice eligibility')
    const bobSubmit = await requestAs(bobCookie, `/orders/${aliceOrderNumber}/reviews`, {
      method: 'POST',
      body: { orderItemId: itemB, rating: 5, content: 'Bob tries to review a foreign order item.' },
    })
    expectStatus(bobSubmit.status, 404, 'Bob submitting on Alice order')

    // --- Alice submits a valid review ---
    const submitted = await requestAs(aliceCookie, `/orders/${aliceOrderNumber}/reviews`, {
      method: 'POST',
      body: { orderItemId: itemA, rating: 5, content: 'Absolutely delicious and always fresh.' },
    })
    expectStatus(submitted.status, 201, 'Alice valid review submission')
    const reviewBody = submitted.body.data.review
    const persistedReview = await prisma.review.findUniqueOrThrow({ where: { id: reviewBody.id } })
    if (persistedReview.userId !== aliceId) throw new Error('Review owner was not set server-side to Alice.')
    if (persistedReview.verifiedPurchase !== true) throw new Error('Verified purchase was not set server-side.')
    if (persistedReview.status !== 'PENDING') throw new Error('New review was not PENDING.')
    if (persistedReview.productId !== productA) throw new Error('Review product does not match the purchased item.')
    if (persistedReview.orderId !== aliceOrder.id) throw new Error('Review order does not match.')
    createdReviewIds.push(reviewBody.id)

    // --- Duplicate review for the same purchase is blocked ---
    const duplicate = await requestAs(aliceCookie, `/orders/${aliceOrderNumber}/reviews`, {
      method: 'POST',
      body: { orderItemId: itemA, rating: 4, content: 'Another attempt at reviewing the same item.' },
    })
    expectStatus(duplicate.status, 409, 'Duplicate review')

    // --- Rating validation (backend) ---
    for (const rating of [0, 6, 3.5]) {
      const invalidRating = await requestAs(aliceCookie, `/orders/${aliceOrderNumber}/reviews`, {
        method: 'POST',
        body: { orderItemId: itemB, rating, content: 'Rating edge case text body here.' },
      })
      expectStatus(invalidRating.status, 400, `Rating ${rating} validation`)
    }

    // --- Content validation (backend) ---
    const shortContent = await requestAs(aliceCookie, `/orders/${aliceOrderNumber}/reviews`, {
      method: 'POST',
      body: { orderItemId: itemB, rating: 5, content: '   ' },
    })
    expectStatus(shortContent.status, 400, 'Blank content')
    const tooShort = await requestAs(aliceCookie, `/orders/${aliceOrderNumber}/reviews`, {
      method: 'POST',
      body: { orderItemId: itemB, rating: 5, content: 'good.' },
    })
    expectStatus(tooShort.status, 400, 'Too-short content')
    const tooLong = await requestAs(aliceCookie, `/orders/${aliceOrderNumber}/reviews`, {
      method: 'POST',
      body: { orderItemId: itemB, rating: 5, content: 'x'.repeat(2001) },
    })
    expectStatus(tooLong.status, 400, 'Too-long content')

    // --- Tampering attempts are rejected or ignored server-side ---
    const foreignItem = await requestAs(aliceCookie, `/orders/${aliceOrderNumber}/reviews`, {
      method: 'POST',
      body: { orderItemId: itemC, rating: 5, content: 'Referencing an item from another order.' },
    })
    expectStatus(foreignItem.status, 403, 'Order item not part of the order')

    const randomItem = await requestAs(aliceCookie, `/orders/${aliceOrderNumber}/reviews`, {
      method: 'POST',
      body: { orderItemId: '00000000-0000-4000-8000-000000000000', rating: 5, content: 'Random item id attempt.' },
    })
    expectStatus(randomItem.status, 403, 'Random order item id')

    const bobItemOnAliceOrder = await requestAs(aliceCookie, `/orders/${aliceOrderNumber}/reviews`, {
      method: 'POST',
      body: { orderItemId: itemD, rating: 5, content: 'Try to attach Bob item to Alice order.' },
    })
    expectStatus(bobItemOnAliceOrder.status, 403, 'Bob order item on Alice order')

    // --- Forgone fields are ignored: status/verified/user cannot be set by the customer ---
    const forged = await requestAs(aliceCookie, `/orders/${aliceOrderNumber}/reviews`, {
      method: 'POST',
      body: {
        orderItemId: itemB,
        rating: 4,
        content: 'A genuine-feeling review body for the tamper test.',
        status: 'APPROVED',
        verifiedPurchase: false,
        userId: bobId,
        productId: productB,
        orderId: bobOrder.id,
      },
    })
    expectStatus(forged.status, 201, 'Tampered review fields')
    const forgedReview = await prisma.review.findUniqueOrThrow({ where: { id: forged.body.data.review.id } })
    if (forgedReview.status !== 'PENDING') throw new Error('Customer was able to set APPROVED status.')
    if (forgedReview.verifiedPurchase !== true) throw new Error('Customer was able to clear verified purchase.')
    if (forgedReview.userId !== aliceId) throw new Error('Customer was able to change review ownership.')
    if (forgedReview.orderId !== aliceOrder.id) throw new Error('Customer was able to change the order link.')
    createdReviewIds.push(forgedReview.id)

    // --- Repurchase in a later order is still reviewable (per order item) ---
    const repurchase = await requestAs(aliceCookie, `/orders/${pendingOrderNumber}/reviews`, {
      method: 'POST',
      body: { orderItemId: itemC, rating: 5, content: 'Reviewing the later repurchase of the same product.' },
    })
    expectStatus(repurchase.status, 403, 'Undelivered repurchase must not be reviewable yet')

    // Cleaner later-order test: a second DELIVERED order after the first is not blocked.
    const secondOrderNumber = randomOrderNumber()
    const secondOrder = await createOrder(alice.id, secondOrderNumber, OrderStatus.DELIVERED, PaymentStatus.PAID, [
      { productId: productA, productName: 'Smoke Product A', quantity: 1 },
    ])
    const secondItem = secondOrder.orderItems[0].id
    const secondReview = await requestAs(aliceCookie, `/orders/${secondOrderNumber}/reviews`, {
      method: 'POST',
      body: { orderItemId: secondItem, rating: 5, content: 'A second delivery of the same product deserves its own review.' },
    })
    expectStatus(secondReview.status, 201, 'Later-order repurchase review')
    createdReviewIds.push(secondReview.body.data.review.id)

    // --- Bob can review his own delivered item ---
    const bobOwnReview = await requestAs(bobCookie, `/orders/${bobOrderNumber}/reviews`, {
      method: 'POST',
      body: { orderItemId: itemD, rating: 3, content: 'Honest feedback after delivery of my own order.' },
    })
    expectStatus(bobOwnReview.status, 201, 'Bob reviewing his own order')
    createdReviewIds.push(bobOwnReview.body.data.review.id)
    const duplicateBob = await requestAs(bobCookie, `/orders/${bobOrderNumber}/reviews`, {
      method: 'POST',
      body: { orderItemId: itemD, rating: 5, content: 'Trying to override my earlier review.' },
    })
    expectStatus(duplicateBob.status, 409, 'Bob duplicate review')

    // --- Eligibility now reflects reviews for the delivered order ---
    const afterEligibility = await requestAs(aliceCookie, `/orders/${aliceOrderNumber}/review-eligibility`)
    const afterItems = afterEligibility.body.data.eligibility.items
    const afterA = afterItems.find((item: { id: string }) => item.id === itemA)
    const afterB = afterItems.find((item: { id: string }) => item.id === itemB)
    if (!afterA?.reviewed || !afterB?.reviewed) throw new Error('Reviewed items were not flagged as reviewed.')
    if (afterA.canReview || afterB.canReview) throw new Error('Reviewed items must not remain reviewable.')
    if (afterA.reviewId !== reviewBody.id) throw new Error('Review id is not exposed in eligibility.')

    console.log('Review HTTP smoke test passed.')
  } finally {
    const deleteReviews = prisma.review.deleteMany({ where: { id: { in: createdReviewIds } } })
    const deleteOrders = prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } })
    const deleteSessions = prisma.customerSession.deleteMany({ where: { id: { in: createdSessionIds } } })
    const deleteUsers = prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
    const deleteProducts = prisma.product.deleteMany({ where: { id: { in: createdProductIds } } })
    await prisma.$transaction([deleteReviews, deleteOrders, deleteSessions, deleteUsers, deleteProducts])
    await prisma.category.deleteMany({ where: { id: categoryId } }).catch(() => undefined)
    if (server) {
      server.closeAllConnections?.()
      await new Promise<void>((resolve) => server.close(() => resolve()))
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