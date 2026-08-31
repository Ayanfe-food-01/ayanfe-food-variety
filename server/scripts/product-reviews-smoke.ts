import { createHmac } from 'node:crypto'
import { OrderStatus, PaymentMethod, PaymentStatus, UserRole } from '@prisma/client'
import { app } from '../src/app.js'
import { env } from '../src/config/env.js'
import { prisma, closeDatabase } from '../src/lib/prisma.js'
import { hashPassword } from '../src/modules/auth/auth.service.js'

const CUSTOMER_SESSION_COOKIE = 'ayanfe_customer_session'
const slug = `product-reviews-smoke-${Date.now().toString(36)}`
const ALICE_COOKIE = `pr-smoke-alice-${slug}`
const BOB_COOKIE = `pr-smoke-bob-${slug}`

const expect = (condition: boolean, label: string) => {
  if (!condition) throw new Error(label)
}

const expectStatus = (actual: number, expected: number, label: string) => {
  expect(actual === expected, `${label}: expected status ${expected}, received ${actual}.`)
}

async function main() {
  const createdReviewIds: string[] = []
  const createdOrderIds: string[] = []
  const createdSessionIds: string[] = []
  const createdUserIds: string[] = []
  const createdProductIds: string[] = []
  let categoryId = ''
  let server: ReturnType<typeof app.listen> | null = null
  let productAId = ''
  let productCId = ''
  let productASlug = ''
  let productCSlug = ''
  let aliceEligibleItemId = ''

  const baseUrl = () => `http://127.0.0.1:${(server?.address() as { port: number }).port}/api/v1`
  const requestAs = async (cookie: string | undefined, path: string): Promise<{ status: number; body: any }> => {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (cookie) headers.Cookie = cookie
    const response = await fetch(`${baseUrl()}${path}`, { headers })
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

  const listKeys = (item: Record<string, unknown>): string[] => Object.keys(item).sort()

  try {
    server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
    })

    const category = await prisma.category.create({
      data: { name: `Pr Review Cat ${slug}`, slug: `pr-review-cat-${slug}` },
    })
    categoryId = category.id

    const createProduct = async (name: string, slugName: string, isActive = true) => {
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
          isActive,
        },
      })
      createdProductIds.push(product.id)
      return product
    }
    const productA = await createProduct(`Pr Review Product A ${slug}`, `pr-review-a-${slug}`)
    const productB = await createProduct(`Pr Review Product B ${slug}`, `pr-review-b-${slug}`)
    const productC = await createProduct(`Pr Review Product C ${slug}`, `pr-review-c-${slug}`)
    const productD = await createProduct(`Pr Review Product D ${slug}`, `pr-review-d-${slug}`, false)
    productAId = productA.id
    productCId = productC.id
    productASlug = productA.slug
    productCSlug = productC.slug

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
    const carol = await createCustomer('Carol Smoke', `${slug}-carol@smoke.local`)
    const dave = await createCustomer('Dave Smoke', `${slug}-dave@smoke.local`)
    const eve = await createCustomer('Eve Smoke', `${slug}-eve@smoke.local`)
    const frank = await createCustomer('Frank Smoke', `${slug}-frank@smoke.local`)
    const gerard = await createCustomer('Gerard Smoke', `${slug}-gerard@smoke.local`)

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

    const createDeliveredOrder = async (userId: string, productId: string, itemCount: number) => {
      const order = await prisma.order.create({
        data: {
          orderNumber: `AFV-2026-${String(100000 + Math.floor(Math.random() * 900000))}`,
          userId,
          customerName: 'Smoke Customer',
          phone: '+2348091112244',
          deliveryAddress: 'Smoke address',
          city: 'Lagos',
          subtotal: 1000 * itemCount,
          deliveryFee: 0,
          total: 1000 * itemCount,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          paymentStatus: PaymentStatus.PAID,
          orderStatus: OrderStatus.DELIVERED,
          orderItems: {
            create: Array.from({ length: itemCount }, (_, index) => ({
              productId,
              productName: `Smoke Item ${index + 1}`,
              unitPrice: 1000,
              quantity: 1,
              subtotal: 1000,
              deliveryFee: 0,
            })),
          },
        },
        select: { id: true, orderItems: { select: { id: true } } },
      })
      createdOrderIds.push(order.id)
      return order
    }

    const createReview = async ({
      userId, productId, orderItemId, rating, status, verifiedPurchase,
    }: {
      userId: string | null; productId: string; orderItemId: string
      rating: number; status: 'APPROVED' | 'PENDING' | 'REJECTED'; verifiedPurchase: boolean
    }) => {
      const review = await prisma.review.create({
        data: {
          productId,
          userId,
          orderId: (await prisma.orderItem.findUniqueOrThrow({ where: { id: orderItemId }, select: { orderId: true } })).orderId,
          orderItemId,
          rating,
          content: 'A valid approved review body of sufficient length.',
          status,
          verifiedPurchase,
        },
      })
      createdReviewIds.push(review.id)
      return review
    }

    // Alice's qualifying order: item1 reviewed (approved 5★), item2 still eligible.
    const aliceOrder = await createDeliveredOrder(alice.id, productA.id, 2)
    const [aliceItem1, aliceItem2] = aliceOrder.orderItems
    aliceEligibleItemId = aliceItem2.id

    // Approved reviews on product A: 5,5,4,4,5 -> average 4.6, distribution 5:3, 4:2.
    const bobOrder = await createDeliveredOrder(bob.id, productA.id, 1)
    const carolOrder = await createDeliveredOrder(carol.id, productA.id, 1)
    const daveOrder = await createDeliveredOrder(dave.id, productA.id, 1)
    const eveOrder = await createDeliveredOrder(eve.id, productA.id, 1)
    await createReview({ userId: alice.id, productId: productA.id, orderItemId: aliceItem1.id, rating: 5, status: 'APPROVED', verifiedPurchase: true })
    await createReview({ userId: bob.id, productId: productA.id, orderItemId: bobOrder.orderItems[0].id, rating: 5, status: 'APPROVED', verifiedPurchase: true })
    await createReview({ userId: carol.id, productId: productA.id, orderItemId: carolOrder.orderItems[0].id, rating: 4, status: 'APPROVED', verifiedPurchase: false })
    await createReview({ userId: dave.id, productId: productA.id, orderItemId: daveOrder.orderItems[0].id, rating: 4, status: 'APPROVED', verifiedPurchase: false })
    await createReview({ userId: eve.id, productId: productA.id, orderItemId: eveOrder.orderItems[0].id, rating: 5, status: 'APPROVED', verifiedPurchase: true })

    // Non-approved reviews must never surface publicly.
    const frankOrder = await createDeliveredOrder(frank.id, productA.id, 1)
    const gerardOrder = await createDeliveredOrder(gerard.id, productA.id, 1)
    const pendingReview = await createReview({ userId: frank.id, productId: productA.id, orderItemId: frankOrder.orderItems[0].id, rating: 1, status: 'PENDING', verifiedPurchase: true })
    const rejectedReview = await createReview({ userId: gerard.id, productId: productA.id, orderItemId: gerardOrder.orderItems[0].id, rating: 1, status: 'REJECTED', verifiedPurchase: true })

    // Product C: single approved review from an orphaned user (user deleted -> SetNull).
    const carolC = await createDeliveredOrder(carol.id, productC.id, 1)
    const orphanedUser = await prisma.user.create({
      data: {
        name: 'Orphan Author',
        email: `${slug}-orphan@smoke.local`,
        passwordHash: await hashPassword('smoke-password-123'),
        role: UserRole.CUSTOMER,
        emailVerified: true,
      },
    })
    createdUserIds.push(orphanedUser.id)
    const orphanReview = await createReview({ userId: orphanedUser.id, productId: productC.id, orderItemId: carolC.orderItems[0].id, rating: 3, status: 'APPROVED', verifiedPurchase: true })
    await prisma.user.delete({ where: { id: orphanedUser.id } })

    // --- Public access (no auth required) ---
    const anon = await requestAs(undefined, `/products/${productASlug}/reviews`)
    expectStatus(anon.status, 200, 'Anonymous product reviews fetch')

    // --- Summary uses APPROVED reviews only ---
    const summary = anon.body.data.summary
    expect(summary.reviewCount === 5, 'Review count must be 5 (approved only).')
    expect(summary.averageRating === 4.6, `Average rating must be 4.6, received ${summary.averageRating}.`)
    expect(summary.distribution['5'] === 3 && summary.distribution['4'] === 2, 'Distribution must be 5:3, 4:2.')
    expect(summary.distribution['1'] === 0 && summary.distribution['2'] === 0 && summary.distribution['3'] === 0, 'Distribution leaks unapproved ratings.')

    // --- Items are approved-only and never leak internal/ownership fields ---
    const allowedKeys = ['authorName', 'content', 'createdAt', 'id', 'rating', 'verifiedPurchase']
    const anonItems = anon.body.data.items
    expect(anonItems.length === 5, 'Default limit must return all 5 approved reviews.')
    for (const item of anonItems) {
      expect(listKeys(item).join(',') === allowedKeys.join(','), `Review item leaked internal fields: ${listKeys(item).join(',')}.`)
    }
    const leakedIds = anonItems.map((item: { id: string }) => item.id)
    expect(!leakedIds.includes(pendingReview.id) && !leakedIds.includes(rejectedReview.id), 'Pending/rejected reviews were exposed.')

    // --- Ordering: newest first ---
    const createdTimes = anonItems.map((item: { createdAt: string }) => Date.parse(item.createdAt))
    expect(createdTimes.every((time: number, index: number) => index === 0 || time <= createdTimes[index - 1]!), 'Reviews must be newest first.')

    // --- Verified purchase badge data comes from the database ---
    const verifiedCount = anonItems.filter((item: { verifiedPurchase: boolean }) => item.verifiedPurchase).length
    expect(verifiedCount === 3, 'Exactly three approved reviews are verified purchases.')

    // --- Pagination ---
    const page1 = await requestAs(undefined, `/products/${productASlug}/reviews?page=1&limit=2`)
    expectStatus(page1.status, 200, 'Page 1 fetch')
    expect(page1.body.data.items.length === 2, 'Page size 2 must return 2 items.')
    expect(page1.body.data.pagination.total === 5 && page1.body.data.pagination.totalPages === 3, 'Pagination totals are wrong.')
    const page2 = await requestAs(undefined, `/products/${productASlug}/reviews?page=2&limit=2`)
    expect(page2.body.data.items.length === 2 && page2.body.data.items[0].id !== page1.body.data.items[0].id, 'Page 2 must differ and be size 2.')
    const page3 = await requestAs(undefined, `/products/${productASlug}/reviews?page=3&limit=2`)
    expect(page3.body.data.items.length === 1, 'Final page must have 1 item.')
    const beyond = await requestAs(undefined, `/products/${productASlug}/reviews?page=99&limit=5`)
    expectStatus(beyond.status, 200, 'Beyond-range page still returns 200')
    expect(beyond.body.data.items.length === 0, 'Beyond-range page must be empty.')

    // --- Product without reviews: no fake summary ---
    const empty = await requestAs(undefined, `/products/pr-review-b-${slug}/reviews`)
    expectStatus(empty.status, 200, 'Empty product fetch')
    expect(empty.body.data.summary.reviewCount === 0, 'Empty product review count must be 0.')
    expect(empty.body.data.summary.averageRating === null, 'Empty product must not expose a fake average.')
    expect(empty.body.data.items.length === 0, 'Empty product must have no items.')
    expect(empty.body.data.reviewAction === null, 'Empty product must not offer an action.')

    // --- Orphaned author fallback name ---
    const orphanFetch = await requestAs(undefined, `/products/${productCId}/reviews`)
    expectStatus(orphanFetch.status, 200, 'Product C fetch by uuid')
    expect(orphanFetch.body.data.summary.reviewCount === 1, 'Product C count')
    expect(orphanFetch.body.data.summary.averageRating === 3, 'Product C average')
    expect(orphanFetch.body.data.items[0].authorName === 'Verified Customer', 'Missing user must fall back to a safe display name.')

    // --- Inactive / missing products never expose reviews ---
    const inactive = await requestAs(undefined, `/products/pr-review-d-${slug}/reviews`)
    expectStatus(inactive.status, 404, 'Inactive product reviews are hidden')
    const missing = await requestAs(undefined, `/products/pr-review-does-not-exist-${slug}/reviews`)
    expectStatus(missing.status, 404, 'Missing product reviews are hidden')

    // --- Eligible customer can write a review for their unreviewed purchase ---
    const aliceView = await requestAs(aliceCookie, `/products/${productASlug}/reviews`)
    expectStatus(aliceView.status, 200, 'Alice fetch')
    expect(aliceView.body.data.reviewAction !== null, 'Alice must receive a review action.')
    expect(aliceView.body.data.reviewAction.orderItemId === aliceEligibleItemId, 'Action must target the unreviewed qualifying item.')

    // --- Customer who already reviewed every qualifying purchase gets no action ---
    const bobView = await requestAs(bobCookie, `/products/${productASlug}/reviews`)
    expect(bobView.body.data.reviewAction === null, 'Bob must not be invited to submit a duplicate review.')

    // --- Guests are never offered a submitting option ---
    expect(anon.body.data.reviewAction === null, 'Guests must not see a review submission option.')

    console.log('Product reviews public API smoke test passed.')
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