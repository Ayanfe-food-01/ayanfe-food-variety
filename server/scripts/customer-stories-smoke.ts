import { OrderStatus, PaymentMethod, PaymentStatus, UserRole } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma, closeDatabase } from '../src/lib/prisma.js'
import { hashPassword } from '../src/modules/auth/auth.service.js'

const slug = `customer-stories-smoke-${Date.now().toString(36)}`

async function main() {
  const createdReviewIds: string[] = []
  const createdTestimonialIds: string[] = []
  const createdOrderIds: string[] = []
  const createdUserIds: string[] = []
  const createdProductIds: string[] = []
  let categoryId = ''
  let server: ReturnType<typeof app.listen> | null = null

  const baseUrl = () => `http://127.0.0.1:${(server?.address() as { port: number }).port}/api/v1`
  const getStories = async (): Promise<{ status: number; body: any }> => {
    const response = await fetch(`${baseUrl()}/store/customer-stories`, {
      headers: { Accept: 'application/json' },
    })
    let body: any = null
    try {
      body = await response.json()
    } catch {
      body = null
    }
    return { status: response.status, body }
  }

  try {
    server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
    })

    // --- Fallback fixture: only cameos that both tests understand ---
    const testimonial = await prisma.testimonial.create({
      data: {
        authorName: `Stories Smoke Author ${slug}`,
        content: 'Smoke testimonial body that should only appear when active and featured.',
        rating: 5,
        isActive: true,
        isFeatured: false,
        displayOrder: 0,
      },
    })
    createdTestimonialIds.push(testimonial.id)

    const category = await prisma.category.create({
      data: { name: `Smoke Story Cat ${slug}`, slug: `smoke-story-cat-${slug}` },
    })
    categoryId = category.id
    const product = await prisma.product.create({
      data: {
        categoryId,
        name: `Smoke Story Product ${slug}`,
        slug: `smoke-story-product-${slug}`,
        description: 'Smoke fixture',
        price: 1000,
        deliveryFee: 0,
        stockQuantity: 20,
        unit: 'bag',
        image: '',
      },
    })
    createdProductIds.push(product.id)
    const customer = await prisma.user.create({
      data: {
        name: 'Stories Smoke Customer',
        email: `${slug}@smoke.local`,
        passwordHash: await hashPassword('smoke-password-123'),
        role: UserRole.CUSTOMER,
        emailVerified: true,
      },
    })
    createdUserIds.push(customer.id)
    const order = await prisma.order.create({
      data: {
        orderNumber: `AFV-2026-${String(100000 + Math.floor(Math.random() * 900000))}`,
        userId: customer.id,
        customerName: 'Smoke Customer',
        phone: '+2348091112223',
        deliveryAddress: 'Smoke address',
        city: 'Lagos',
        subtotal: 1000,
        deliveryFee: 0,
        total: 1000,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.DELIVERED,
        orderItems: {
          create: {
            productId: product.id,
            productName: product.name,
            unitPrice: 1000,
            quantity: 1,
            subtotal: 1000,
            deliveryFee: 0,
          },
        },
      },
      select: { id: true, orderItems: { select: { id: true } } },
    })
    createdOrderIds.push(order.id)

    const review = await prisma.review.create({
      data: {
        productId: product.id,
        userId: customer.id,
        orderId: order.id,
        orderItemId: order.orderItems[0].id,
        rating: 4,
        content: 'Smoke review body used for the customer stories endpoint test.',
        status: 'PENDING',
        verifiedPurchase: true,
        isActive: true,
        isFeatured: false,
        displayOrder: 0,
      },
    })
    createdReviewIds.push(review.id)

    // --- Not featured, pending review and unfeatured testimonial stay hidden ---
    const empty = await getStories()
    if (empty.status !== 200) throw new Error(`Customer stories endpoint returned ${empty.status}.`)
    const initialIds = empty.body.data.items.map((item: { id: string }) => item.id)
    if (initialIds.includes(`testimonial:${testimonial.id}`)) throw new Error('Unfeatured testimonial was shown.')
    if (initialIds.includes(`review:${review.id}`)) throw new Error('Pending review was shown.')

    // --- Feature + activate-only flows ---
    await prisma.testimonial.update({ where: { id: testimonial.id }, data: { isFeatured: true } })
    let afterFeature = await getStories()
    if (!afterFeature.body.data.items.some((item: { id: string }) => item.id === `testimonial:${testimonial.id}`)) {
      throw new Error('Featured testimonial did not appear.')
    }
    const shownTestimonial = afterFeature.body.data.items.find((item: { id: string }) => item.id === `testimonial:${testimonial.id}`)
    if (shownTestimonial.type !== 'testimonial') throw new Error('Testimonial was not typed correctly.')
    if (shownTestimonial.rating !== 5) throw new Error('Testimonial rating was not surfaced.')
    if (shownTestimonial.verifiedPurchase !== false) throw new Error('Testimonial was shown as a verified purchase.')

    await prisma.testimonial.update({ where: { id: testimonial.id }, data: { isActive: false } })
    const afterDeactivate = await getStories()
    if (afterDeactivate.body.data.items.some((item: { id: string }) => item.id === `testimonial:${testimonial.id}`)) {
      throw new Error('Deactivated testimonial still appeared.')
    }
    await prisma.testimonial.update({ where: { id: testimonial.id }, data: { isActive: true } })
    await prisma.testimonial.update({ where: { id: testimonial.id }, data: { isFeatured: false } })
    const afterUnfeature = await getStories()
    if (afterUnfeature.body.data.items.some((item: { id: string }) => item.id === `testimonial:${testimonial.id}`)) {
      throw new Error('Unfeatured testimonial still appeared.')
    }

    // --- Approve + feature a review makes it appear, typed as a review, never as a verified purchase when untracked ---
    await prisma.review.update({
      where: { id: review.id },
      data: { status: 'APPROVED', isActive: true, isFeatured: true },
    })
    const reviewShown = await getStories()
    const shownReview = reviewShown.body.data.items.find((item: { id: string }) => item.id === `review:${review.id}`)
    if (!shownReview) throw new Error('Approved + featured review did not appear.')
    if (shownReview.type !== 'review') throw new Error('Authorized review was not typed as a review.')
    if (shownReview.authorName !== customer.name) throw new Error('Review author name was not surfaced.')
    if (shownReview.rating !== 4) throw new Error('Review rating was not surfaced.')
    if (shownReview.verifiedPurchase !== true) throw new Error('Verified purchase flag was not surfaced for the review.')

    // --- Rejected reviews never appear even if the featured flag lingers ---
    await prisma.review.update({ where: { id: review.id }, data: { status: 'REJECTED', isFeatured: true } })
    const afterReject = await getStories()
    if (afterReject.body.data.items.some((item: { id: string }) => item.id === `review:${review.id}`)) {
      throw new Error('Rejected review appeared despite the stale featured flag.')
    }

    // --- Approved but inactive reviews never appear even if featured ---
    await prisma.review.update({
      where: { id: review.id },
      data: { status: 'APPROVED', isFeatured: true, isActive: false },
    })
    const afterInactiveReview = await getStories()
    if (afterInactiveReview.body.data.items.some((item: { id: string }) => item.id === `review:${review.id}`)) {
      throw new Error('Approved but inactive review appeared on the homepage.')
    }

    // --- Sources are reported and the response is a single combined list ---
    await prisma.review.update({ where: { id: review.id }, data: { status: 'APPROVED', isActive: true } })
    const combined = await getStories()
    const sourceSections = combined.body.data.sources
    if (sourceSections.reviews < 1) throw new Error('Review source count was not reported.')
    if (typeof sourceSections.testimonials !== 'number') throw new Error('Testimonial source count was not reported.')

    // --- The homepage hard-caps the combined list even with legacy over-featured data ---
    const capFillers = Array.from({ length: 40 }, (_unused, index) => ({
      authorName: `Stories Cap ${slug} ${index}`,
      content: 'Capacity trim smoke fixture.',
      rating: 5,
      isActive: true,
      isFeatured: true,
      displayOrder: index,
    }))
    await prisma.testimonial.createMany({ data: capFillers })
    const capFillerRows = await prisma.testimonial.findMany({
      where: { authorName: { startsWith: `Stories Cap ${slug}` } },
      select: { id: true },
    })
    createdTestimonialIds.push(...capFillerRows.map((row) => row.id))
    const capped = await getStories()
    if (capped.body.data.items.length > 30) throw new Error('Customer stories endpoint exceeded the homepage cap.')
    if (capped.body.data.sources.testimonials + capped.body.data.sources.reviews !== capped.body.data.items.length) {
      throw new Error('Customer stories sources did not match the returned items.')
    }

    console.log('Customer stories homepage smoke test passed.')
  } finally {
    const deleteReviews = prisma.review.deleteMany({ where: { id: { in: createdReviewIds } } })
    const deleteTestimonials = prisma.testimonial.deleteMany({ where: { id: { in: createdTestimonialIds } } })
    const deleteOrders = prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } })
    const deleteUsers = prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
    const deleteProducts = prisma.product.deleteMany({ where: { id: { in: createdProductIds } } })
    await prisma.$transaction([deleteReviews, deleteTestimonials, deleteOrders, deleteUsers, deleteProducts])
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