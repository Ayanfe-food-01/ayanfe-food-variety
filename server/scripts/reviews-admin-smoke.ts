import { createHmac } from 'node:crypto'
import { OrderStatus, PaymentMethod, PaymentStatus, UserRole } from '@prisma/client'
import { app } from '../src/app.js'
import { env } from '../src/config/env.js'
import { prisma, closeDatabase } from '../src/lib/prisma.js'
import { hashPassword } from '../src/modules/auth/auth.service.js'

const ADMIN_SESSION_COOKIE = 'ayanfe_admin_session'
const CUSTOMER_SESSION_COOKIE = 'ayanfe_customer_session'
const slug = `reviews-admin-smoke-${Date.now().toString(36)}`
const ADMIN_RAW_TOKEN = `smoke-admin-${slug}`
const CUSTOMER_RAW_TOKEN = `smoke-customer-${slug}`

const randomOrderNumber = () => `AFV-2026-${String(100000 + Math.floor(Math.random() * 900000))}`

const expectStatus = (actual: number, expected: number, label: string) => {
  if (actual !== expected) {
    throw new Error(`${label}: expected status ${expected}, received ${actual}.`)
  }
}

const MAX_FEATURED_HOMEPAGE_ITEMS = 30

const countFeaturedSlots = async (): Promise<number> => {
  const [testimonials, reviews] = await Promise.all([
    prisma.testimonial.count({ where: { isActive: true, isFeatured: true } }),
    prisma.review.count({ where: { isActive: true, isFeatured: true, status: 'APPROVED' } }),
  ])
  return testimonials + reviews
}

async function main() {
  const createdReviewIds: string[] = []
  const createdOrderIds: string[] = []
  const createdSessionIds: string[] = []
  const createdUserIds: string[] = []
  const createdProductIds: string[] = []
  const createdAdminSessionIds: string[] = []
  const createdFillerTestimonialIds: string[] = []
  let categoryId = ''
  let server: ReturnType<typeof app.listen> | null = null
  let reviewId = ''
  let rejectedReviewId = ''

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
    server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
    })

    const category = await prisma.category.create({
      data: { name: `Smoke Review Cat ${slug}`, slug: `smoke-review-cat-${slug}` },
    })
    categoryId = category.id

    const product = await prisma.product.create({
      data: {
        categoryId,
        name: `Smoke Product ${slug}`,
        slug: `smoke-product-${slug}`,
        description: 'Smoke fixture',
        price: 1000,
        deliveryFee: 0,
        stockQuantity: 20,
        unit: 'bag',
        image: '',
      },
    })
    createdProductIds.push(product.id)

    const admin = await prisma.user.create({
      data: {
        name: 'Smoke Admin',
        email: `${slug}-admin@smoke.local`,
        passwordHash: await hashPassword('smoke-password-123'),
        role: UserRole.ADMIN,
        emailVerified: true,
      },
    })
    createdUserIds.push(admin.id)
    const adminSession = await prisma.adminSession.create({
      data: {
        userId: admin.id,
        tokenHash: createSessionToken(ADMIN_RAW_TOKEN),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    })
    createdAdminSessionIds.push(adminSession.id)
    const adminCookie = `${ADMIN_SESSION_COOKIE}=${ADMIN_RAW_TOKEN}`

    const customer = await prisma.user.create({
      data: {
        name: 'Smoke Review Customer',
        email: `${slug}-customer@smoke.local`,
        passwordHash: await hashPassword('smoke-password-123'),
        role: UserRole.CUSTOMER,
        emailVerified: true,
      },
    })
    createdUserIds.push(customer.id)
    const customerSession = await prisma.customerSession.create({
      data: {
        userId: customer.id,
        tokenHash: createSessionToken(CUSTOMER_RAW_TOKEN),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    })
    createdSessionIds.push(customerSession.id)
    const customerCookie = `${CUSTOMER_SESSION_COOKIE}=${CUSTOMER_RAW_TOKEN}`

    const orderNumber = randomOrderNumber()
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: customer.id,
        customerName: 'Smoke Customer',
        phone: '+2348091112223',
        deliveryAddress: 'Smoke address',
        city: 'Lagos',
        subtotal: 2000,
        deliveryFee: 0,
        total: 2000,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.DELIVERED,
        orderItems: {
          create: [
            {
              productId: product.id,
              productName: product.name,
              unitPrice: 1000,
              quantity: 2,
              subtotal: 2000,
              deliveryFee: 0,
            },
            {
              productId: product.id,
              productName: product.name,
              unitPrice: 1000,
              quantity: 1,
              subtotal: 1000,
              deliveryFee: 0,
            },
          ],
        },
      },
      select: { id: true, orderItems: { select: { id: true } } },
    })
    createdOrderIds.push(order.id)
    const firstItem = order.orderItems[0].id
    const secondItem = order.orderItems[1].id

    // Create two PENDING reviews through the customer flow.
    const submitted = await requestAs(customerCookie, `/orders/${orderNumber}/reviews`, {
      method: 'POST',
      body: { orderItemId: firstItem, rating: 5, content: 'Fresh and neatly packed every single time.' },
    })
    expectStatus(submitted.status, 201, 'Customer review submission')
    reviewId = submitted.body.data.review.id
    createdReviewIds.push(reviewId)

    const submittedRejected = await requestAs(customerCookie, `/orders/${orderNumber}/reviews`, {
      method: 'POST',
      body: { orderItemId: secondItem, rating: 2, content: 'Packaging was damaged on arrival this week.' },
    })
    expectStatus(submittedRejected.status, 201, 'Second customer review submission')
    rejectedReviewId = submittedRejected.body.data.review.id
    createdReviewIds.push(rejectedReviewId)

    // --- Admin boundary: only administrators reach review moderation ---
    const anonList = await requestAs(undefined, '/admin/reviews')
    expectStatus(anonList.status, 401, 'Unauthenticated admin reviews list')
    const customerList = await requestAs(customerCookie, '/admin/reviews')
    expectStatus(customerList.status, 403, 'Customer blocked from admin reviews list')
    if (customerList.body?.data) throw new Error('Customer was able to read review moderation data.')
    const anonDetail = await requestAs(undefined, `/admin/reviews/${reviewId}`)
    expectStatus(anonDetail.status, 401, 'Unauthenticated admin review detail')
    const customerDetail = await requestAs(customerCookie, `/admin/reviews/${reviewId}`)
    expectStatus(customerDetail.status, 403, 'Customer blocked from admin review detail')
    const anonStatusChange = await requestAs(undefined, `/admin/reviews/${reviewId}/status`, {
      method: 'PATCH',
      body: { status: 'APPROVED' },
    })
    expectStatus(anonStatusChange.status, 401, 'Unauthenticated status change')
    const customerStatusChange = await requestAs(customerCookie, `/admin/reviews/${reviewId}/status`, {
      method: 'PATCH',
      body: { status: 'APPROVED' },
    })
    expectStatus(customerStatusChange.status, 403, 'Customer blocked from approving reviews')

    // --- Admin list exposes moderation data ---
    const adminList = await requestAs(adminCookie, '/admin/reviews')
    expectStatus(adminList.status, 200, 'Admin reviews list')
    const listed = adminList.body.data.reviews.find((review: { id: string }) => review.id === reviewId)
    if (!listed) throw new Error('New review did not appear in the admin list.')
    if (listed.status !== 'PENDING') throw new Error('New review was not listed as PENDING.')
    if (listed.customerName !== 'Smoke Review Customer') throw new Error('Customer name missing from admin list.')
    if (listed.productName !== product.name) throw new Error('Product name missing from admin list.')
    if (listed.verifiedPurchase !== true) throw new Error('Verified purchase flag missing from admin list.')
    if (listed.orderNumber !== orderNumber) throw new Error('Order number missing from admin list.')

    // --- Filters ---
    const pendingFilter = await requestAs(adminCookie, '/admin/reviews?status=pending')
    expectStatus(pendingFilter.status, 200, 'Pending status filter')
    if (!pendingFilter.body.data.reviews.some((review: { id: string }) => review.id === reviewId)) {
      throw new Error('Pending status filter hid a pending review.')
    }
    const approvedFilter = await requestAs(adminCookie, '/admin/reviews?status=approved')
    expectStatus(approvedFilter.status, 200, 'Approved status filter')
    if (approvedFilter.body.data.reviews.some((review: { id: string }) => review.id === reviewId)) {
      throw new Error('Approved status filter leaked a pending review.')
    }
    const ratingFilter = await requestAs(adminCookie, '/admin/reviews?rating=2')
    expectStatus(ratingFilter.status, 200, 'Rating filter')
    if (!ratingFilter.body.data.reviews.some((review: { id: string }) => review.id === rejectedReviewId)) {
      throw new Error('Rating filter did not surface the 2-star review.')
    }
    const verifiedFilter = await requestAs(adminCookie, '/admin/reviews?verified=not-verified')
    expectStatus(verifiedFilter.status, 200, 'Not-verified filter')
    if (verifiedFilter.body.data.reviews.some((review: { id: string }) => review.id === reviewId)) {
      throw new Error('Verified review leaked into the not-verified filter.')
    }
    const search = await requestAs(adminCookie, `/admin/reviews?search=${encodeURIComponent('damaged on arrival')}`)
    expectStatus(search.status, 200, 'Content search')
    if (!search.body.data.reviews.some((review: { id: string }) => review.id === rejectedReviewId)) {
      throw new Error('Content search did not surface the matching review.')
    }
    const searchByCustomer = await requestAs(adminCookie, '/admin/reviews?search=Smoke%20Review%20Customer')
    expectStatus(searchByCustomer.status, 200, 'Customer name search')
    if (!searchByCustomer.body.data.reviews.some((review: { id: string }) => review.id === reviewId)) {
      throw new Error('Customer name search did not surface the review.')
    }
    const invalidStatus = await requestAs(adminCookie, '/admin/reviews?status=pendingish')
    expectStatus(invalidStatus.status, 400, 'Invalid status filter')

    // --- Featured requires APPROVED (backend enforcement) ---
    const earlyFeatured = await requestAs(adminCookie, `/admin/reviews/${reviewId}/featured`, {
      method: 'PATCH',
      body: { isFeatured: true },
    })
    expectStatus(earlyFeatured.status, 409, 'Featuring a pending review')
    const badId = await requestAs(adminCookie, '/admin/reviews/not-a-uuid', {})
    expectStatus(badId.status, 400, 'Invalid review id')

    // --- Display order endpoint has the same admin boundary ---
    const anonOrder = await requestAs(undefined, `/admin/reviews/${reviewId}/order`, {
      method: 'PATCH',
      body: { displayOrder: 5 },
    })
    expectStatus(anonOrder.status, 401, 'Unauthenticated display order change')
    const customerOrder = await requestAs(customerCookie, `/admin/reviews/${reviewId}/order`, {
      method: 'PATCH',
      body: { displayOrder: 5 },
    })
    expectStatus(customerOrder.status, 403, 'Customer blocked from changing display order')
    const negativeOrder = await requestAs(adminCookie, `/admin/reviews/${reviewId}/order`, {
      method: 'PATCH',
      body: { displayOrder: -1 },
    })
    expectStatus(negativeOrder.status, 400, 'Negative display order rejected')
    const oversizedOrder = await requestAs(adminCookie, `/admin/reviews/${reviewId}/order`, {
      method: 'PATCH',
      body: { displayOrder: 1000000 },
    })
    expectStatus(oversizedOrder.status, 400, 'Oversized display order rejected')
    const nonNumericOrder = await requestAs(adminCookie, `/admin/reviews/${reviewId}/order`, {
      method: 'PATCH',
      body: { displayOrder: 'abc' },
    })
    expectStatus(nonNumericOrder.status, 400, 'Non-numeric display order rejected')

    // --- Approve makes the review public and rating-eligible ---
    const publicBefore = await requestAs(undefined, `/products/${product.slug}/reviews`)
    expectStatus(publicBefore.status, 200, 'Public product reviews (before approval)')
    if (publicBefore.body.data.items.some((item: { id: string }) => item.id === reviewId)) {
      throw new Error('Pending review leaked to the public endpoint.')
    }

    const approved = await requestAs(adminCookie, `/admin/reviews/${reviewId}/status`, {
      method: 'PATCH',
      body: { status: 'APPROVED' },
    })
    expectStatus(approved.status, 200, 'Approve review')
    if (approved.body.data.review.status !== 'APPROVED') throw new Error('Review did not become APPROVED.')
    const approvedAgain = await requestAs(adminCookie, `/admin/reviews/${reviewId}/status`, {
      method: 'PATCH',
      body: { status: 'APPROVED' },
    })
    expectStatus(approvedAgain.status, 409, 'Double-approve review')

    // --- Display order persists and appears in the admin list ---
    const ordered = await requestAs(adminCookie, `/admin/reviews/${reviewId}/order`, {
      method: 'PATCH',
      body: { displayOrder: 12 },
    })
    expectStatus(ordered.status, 200, 'Update review display order')
    if (ordered.body.data.review.displayOrder !== 12) throw new Error('Review display order did not persist.')
    const orderList = await requestAs(adminCookie, '/admin/reviews')
    const listedOrdered = orderList.body.data.reviews.find((review: { id: string }) => review.id === reviewId)
    if (!listedOrdered || listedOrdered.displayOrder !== 12) throw new Error('Review display order missing from the admin list.')

    // --- Admin lists report homepage featured capacity metrics ---
    const metrics = adminList.body.data.featured
    if (!metrics || metrics.max !== MAX_FEATURED_HOMEPAGE_ITEMS) {
      throw new Error('Featured capacity maximum was not reported by the admin list.')
    }
    if (typeof metrics.used !== 'number' || typeof metrics.remaining !== 'number') {
      throw new Error('Featured capacity usage was not reported by the admin list.')
    }

    const publicAfter = await requestAs(undefined, `/products/${product.slug}/reviews`)
    expectStatus(publicAfter.status, 200, 'Public product reviews (after approval)')
    if (!publicAfter.body.data.items.some((item: { id: string }) => item.id === reviewId)) {
      throw new Error('Approved review did not appear on the public endpoint.')
    }
    if (publicAfter.body.data.summary.reviewCount !== 1) {
      throw new Error('Rating summary should only count the approved review.')
    }

    const featured = await requestAs(adminCookie, `/admin/reviews/${reviewId}/featured`, {
      method: 'PATCH',
      body: { isFeatured: true },
    })
    expectStatus(featured.status, 200, 'Feature approved review')
    if (featured.body.data.review.isFeatured !== true) throw new Error('Approved review was not featured.')
    const unfeatured = await requestAs(adminCookie, `/admin/reviews/${reviewId}/featured`, {
      method: 'PATCH',
      body: { isFeatured: false },
    })
    expectStatus(unfeatured.status, 200, 'Unfeature approved review')

    // --- Rejecting an approved review hides it and clears featured ---
    const reFeatured = await requestAs(adminCookie, `/admin/reviews/${reviewId}/featured`, {
      method: 'PATCH',
      body: { isFeatured: true },
    })
    expectStatus(reFeatured.status, 200, 'Re-feature for rejection flow')
    const rejected = await requestAs(adminCookie, `/admin/reviews/${reviewId}/status`, {
      method: 'PATCH',
      body: { status: 'REJECTED' },
    })
    expectStatus(rejected.status, 200, 'Reject approved review')
    if (rejected.body.data.review.status !== 'REJECTED') throw new Error('Review did not become REJECTED.')
    if (rejected.body.data.review.isFeatured !== false) throw new Error('Rejected review was left featured.')
    const publicAfterReject = await requestAs(undefined, `/products/${product.slug}/reviews`)
    expectStatus(publicAfterReject.status, 200, 'Public product reviews (after rejection)')
    if (publicAfterReject.body.data.items.some((item: { id: string }) => item.id === reviewId)) {
      throw new Error('Rejected review leaked to the public endpoint.')
    }
    if (publicAfterReject.body.data.summary.reviewCount !== 0) {
      throw new Error('Rejected review still counted in the summary.')
    }
    const retryRejected = await requestAs(adminCookie, `/admin/reviews/${reviewId}/status`, {
      method: 'PATCH',
      body: { status: 'REJECTED' },
    })
    expectStatus(retryRejected.status, 409, 'Double-reject review')
    const rejectedFeaturedToggle = await requestAs(adminCookie, `/admin/reviews/${reviewId}/featured`, {
      method: 'PATCH',
      body: { isFeatured: true },
    })
    expectStatus(rejectedFeaturedToggle.status, 409, 'Featuring a rejected review')

    // --- Rew-star review is rejected; then re-approval stays off by default ---
    const rejectedSecond = await requestAs(adminCookie, `/admin/reviews/${rejectedReviewId}/status`, {
      method: 'PATCH',
      body: { status: 'REJECTED' },
    })
    expectStatus(rejectedSecond.status, 200, 'Reject second review')
    const reApproved = await requestAs(adminCookie, `/admin/reviews/${rejectedReviewId}/status`, {
      method: 'PATCH',
      body: { status: 'APPROVED' },
    })
    expectStatus(reApproved.status, 200, 'Re-approve a rejected review')
    if (reApproved.body.data.review.isFeatured !== false) throw new Error('Re-approval unexpectedly featured the review.')

    // --- Homepage featured limit is enforced, not just communicated ---
    const capacityBase = await countFeaturedSlots()
    if (capacityBase < MAX_FEATURED_HOMEPAGE_ITEMS) {
      const needed = MAX_FEATURED_HOMEPAGE_ITEMS - capacityBase
      const fillerData = Array.from({ length: needed }, (_unused, index) => ({
        authorName: `${slug} Capacity ${index}`,
        content: 'Capacity smoke fixture testimonial used to fill the homepage featured limit.',
        rating: 5,
        isActive: true,
        isFeatured: true,
        displayOrder: 1000 + index,
      }))
      await prisma.testimonial.createMany({ data: fillerData })
      const fillers = await prisma.testimonial.findMany({
        where: { authorName: { startsWith: `${slug} Capacity` } },
        select: { id: true },
      })
      createdFillerTestimonialIds.push(...fillers.map((filler) => filler.id))
    }
    const capacityOverflow = await requestAs(adminCookie, `/admin/reviews/${rejectedReviewId}/featured`, {
      method: 'PATCH',
      body: { isFeatured: true },
    })
    expectStatus(capacityOverflow.status, 409, 'Featuring beyond the homepage capacity limit')
    const capacityList = await requestAs(adminCookie, '/admin/reviews')
    const capacityMetrics = capacityList.body.data.featured
    if (!capacityMetrics) throw new Error('Featured metrics missing from the admin list.')
    if (capacityMetrics.max !== MAX_FEATURED_HOMEPAGE_ITEMS) throw new Error('Featured maximum was not reported correctly.')
    if (capacityMetrics.used < MAX_FEATURED_HOMEPAGE_ITEMS) throw new Error('Featured metrics understated capacity usage.')
    if (capacityMetrics.remaining !== 0) throw new Error('Featured metrics did not report the limit as reached.')
    const capacityDetail = await requestAs(adminCookie, `/admin/reviews/${rejectedReviewId}`)
    if (capacityDetail.body.data.review.isFeatured !== false) throw new Error('Failed capacity feature changed the review.')
    const capacityFilled = await countFeaturedSlots()
    if (capacityFilled < MAX_FEATURED_HOMEPAGE_ITEMS) throw new Error('Capacity filler testimonials were not counted.')

    // --- Only active testimonials can be featured (backend enforcement) ---
    const inactiveTestimonial = await prisma.testimonial.create({
      data: {
        authorName: `Inactive Feature ${slug}`,
        content: 'Inactive testimonial must not be featureable.',
        rating: 5,
        isActive: false,
        isFeatured: false,
        displayOrder: 0,
      },
    })
    createdFillerTestimonialIds.push(inactiveTestimonial.id)
    const inactiveFeature = await requestAs(adminCookie, `/admin/testimonials/${inactiveTestimonial.id}/featured`, {
      method: 'PATCH',
      body: { isFeatured: true },
    })
    expectStatus(inactiveFeature.status, 409, 'Featuring an inactive testimonial')
    const inactiveTestimonialList = await requestAs(adminCookie, '/admin/testimonials')
    const listedInactive = inactiveTestimonialList.body.data.testimonials.find((item: { id: string }) => item.id === inactiveTestimonial.id)
    if (listedInactive?.isFeatured !== false) throw new Error('Inactive testimonial was featured by the backend.')
    if (!inactiveTestimonialList.body.data.featured) throw new Error('Featured metrics missing from the testimonial list.')

    // --- Deletion requires explicit confirmation and does not affect the order ---
    const deleteWithoutConfirm = await requestAs(adminCookie, `/admin/reviews/${reviewId}`, {
      method: 'DELETE',
      body: {},
    })
    expectStatus(deleteWithoutConfirm.status, 400, 'Delete review without confirmation')
    const deleted = await requestAs(adminCookie, `/admin/reviews/${reviewId}`, {
      method: 'DELETE',
      body: { confirm: true },
    })
    expectStatus(deleted.status, 200, 'Delete review with confirmation')
    createdReviewIds.splice(createdReviewIds.indexOf(reviewId), 1)
    const deletedDetail = await requestAs(adminCookie, `/admin/reviews/${reviewId}`)
    expectStatus(deletedDetail.status, 404, 'Deleted review detail')
    const survivingOrder = await prisma.order.findFirst({
      where: { orderNumber },
      include: { orderItems: true },
    })
    if (!survivingOrder || survivingOrder.orderItems.length !== 2) {
      throw new Error('Deleting a review affected the order.')
    }

    console.log('Review admin moderation smoke test passed.')
  } finally {
    const deleteReviews = prisma.review.deleteMany({ where: { id: { in: createdReviewIds } } })
    const deleteOrders = prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } })
    const deleteSessions = prisma.customerSession.deleteMany({ where: { id: { in: createdSessionIds } } })
    const deleteAdminSessions = prisma.adminSession.deleteMany({ where: { id: { in: createdAdminSessionIds } } })
    const deleteUsers = prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
    const deleteProducts = prisma.product.deleteMany({ where: { id: { in: createdProductIds } } })
    const deleteCapacityTestimonials = prisma.testimonial.deleteMany({ where: { id: { in: createdFillerTestimonialIds } } })
    await prisma.$transaction([
      deleteReviews,
      deleteOrders,
      deleteSessions,
      deleteAdminSessions,
      deleteUsers,
      deleteProducts,
      deleteCapacityTestimonials,
    ])
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