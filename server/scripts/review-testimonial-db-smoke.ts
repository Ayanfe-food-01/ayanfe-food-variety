import { OrderStatus, PaymentStatus, ReviewStatus, ShoppingMode, UserRole } from '@prisma/client'
import { prisma, closeDatabase } from '../src/lib/prisma.js'
import { hashPassword } from '../src/modules/auth/auth.service.js'

const slug = `review-testimonial-smoke-${Date.now().toString(36)}`

const expectThrows = async (operation: () => Promise<unknown>, message: string): Promise<unknown> => {
  try {
    await operation()
  } catch (error: unknown) {
    return error
  }
  throw new Error(message)
}

async function main() {
  const beforeCounts = {
    products: await prisma.product.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    users: await prisma.user.count(),
  }

  let categoryId = ''
  let productId = ''
  let orderItemId = ''
  let orderId = ''
  let reviewerId = ''
  const createdReviewIds: string[] = []
  const createdTestimonialIds: string[] = []

  try {
    const category = await prisma.category.create({
      data: {
        name: `Smoke Review Category ${slug}`,
        slug: `smoke-review-category-${slug}`,
      },
    })
    categoryId = category.id
    const product = await prisma.product.create({
      data: {
        categoryId,
        name: 'Smoke Review Product',
        slug: `smoke-review-product-${slug}`,
        description: 'Smoke fixture',
        price: 1200,
        deliveryFee: 0,
        stockQuantity: 20,
        unit: 'bag',
        image: '',
      },
    })
    productId = product.id

    const reviewer = await prisma.user.create({
      data: {
        name: 'Smoke Reviewer',
        email: `${slug}@smoke.local`,
        passwordHash: await hashPassword('smoke-password-123'),
        role: UserRole.CUSTOMER,
        emailVerified: true,
      },
    })
    reviewerId = reviewer.id

    const order = await prisma.order.create({
      data: {
        orderNumber: `AFV-2026-${String(100000 + Math.floor(Math.random() * 900000))}`,
        userId: reviewer.id,
        customerName: 'Smoke Reviewer',
        phone: '+2348091112223',
        deliveryAddress: 'Smoke address',
        city: 'Lagos',
        subtotal: 1200,
        deliveryFee: 0,
        total: 1200,
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.DELIVERED,
        orderItems: {
          create: [
            { productId, productName: product.name, unitPrice: 1200, quantity: 1, subtotal: 1200, deliveryFee: 0 },
          ],
        },
      },
      select: { id: true, orderItems: { select: { id: true } } },
    })
    orderId = order.id
    orderItemId = order.orderItems[0].id

    // --- Rating domain: valid rating stores; 0 and 6 are rejected by the DB ---
    const review = await prisma.review.create({
      data: { productId, userId: reviewer.id, orderId, orderItemId, rating: 5, content: 'Excellent quality.', status: ReviewStatus.PENDING, verifiedPurchase: false },
    })
    createdReviewIds.push(review.id)
    if (review.rating !== 5 || review.status !== 'PENDING' || review.verifiedPurchase !== false) {
      throw new Error('Review default/assigned values did not persist correctly.')
    }
    if (review.isActive !== true || review.isFeatured !== false || review.displayOrder !== 0) {
      throw new Error('Review featured-content defaults are wrong.')
    }

    await expectThrows(
      () => prisma.review.create({ data: { productId, userId: reviewer.id, orderId, orderItemId, rating: 0, content: 'Invalid lower rating.' } }),
      'Rating 0 was accepted.',
    )
    await expectThrows(
      () => prisma.review.create({ data: { productId, userId: reviewer.id, orderId, orderItemId, rating: 6, content: 'Invalid upper rating.' } }),
      'Rating 6 was accepted.',
    )
    await expectThrows(
      () => prisma.review.create({ data: { productId, userId: reviewer.id, orderId, orderItemId, rating: 4, content: '   ' } }),
      'Blank review content was accepted.',
    )

    // --- One review per purchased line item ---
    await expectThrows(
      () => prisma.review.create({ data: { productId, userId: reviewer.id, orderId, orderItemId, rating: 4, content: 'Duplicate review.' } }),
      'A second review for the same order item was accepted.',
    )

    // --- Restrict: a reviewed product cannot be deleted ---
    await expectThrows(() => prisma.product.delete({ where: { id: productId } }), 'A reviewed product was deleted.')

    // --- Restrict: a reviewed order cannot be deleted ---
    await expectThrows(() => prisma.order.delete({ where: { id: orderId } }), 'A reviewed order was deleted.')

    // --- SetNull: deleting the reviewer keeps the review but severs ownership ---
    await prisma.user.delete({ where: { id: reviewer.id } })
    const orphaned = await prisma.review.findUniqueOrThrow({ where: { id: review.id } })
    if (orphaned.userId !== null) throw new Error('Deleting the reviewer did not null the review owner.')

    // --- Testimonials: admin-managed rows, no user/product/order links ---
    const testimonial = await prisma.testimonial.create({
      data: { authorName: 'Amina', content: 'A lovely shop.', rating: 5, isActive: true, isFeatured: true, displayOrder: 1 },
    })
    createdTestimonialIds.push(testimonial.id)
    if (testimonial.rating !== 5 || testimonial.isFeatured !== true) throw new Error('Testimonial values did not persist.')

    const unratedTestimonial = await prisma.testimonial.create({
      data: { authorName: 'Chidi', content: 'Nice experience.' },
    })
    createdTestimonialIds.push(unratedTestimonial.id)
    if (unratedTestimonial.rating !== null) throw new Error('Testimonial without a rating was not stored as null.')

    await expectThrows(
      () => prisma.testimonial.create({ data: { authorName: 'Baba', content: 'Invalid rating.', rating: 0 } }),
      'Testimonial rating 0 was accepted.',
    )
    await expectThrows(
      () => prisma.testimonial.create({ data: { authorName: 'Baba', content: '   ' } }),
      'Blank testimonial content was accepted.',
    )

    // --- Cleanup fixtures (review rows first because orders/products are Restrict-protected) ---
    await prisma.review.deleteMany({ where: { id: { in: createdReviewIds } } })
    await prisma.orderItem.deleteMany({ where: { orderId } })
    await prisma.order.delete({ where: { id: orderId } })
    await prisma.testimonial.deleteMany({ where: { id: { in: createdTestimonialIds } } })
    await prisma.product.delete({ where: { id: productId } })
    await prisma.category.delete({ where: { id: categoryId } })

    const afterCounts = {
      products: await prisma.product.count(),
      orders: await prisma.order.count(),
      orderItems: await prisma.orderItem.count(),
      users: await prisma.user.count(),
    }
    const unchanged = Object.keys(beforeCounts).every(
      (key) => beforeCounts[key as keyof typeof beforeCounts] === afterCounts[key as keyof typeof afterCounts],
    )
    if (!unchanged) throw new Error('Existing product/order/user rows were unintentionally modified.')

    console.log('Review & testimonial database smoke test passed.')
  } finally {
    await prisma.review.deleteMany({ where: { id: { in: createdReviewIds } } })
    await prisma.testimonial.deleteMany({ where: { id: { in: createdTestimonialIds } } })
    await prisma.user.deleteMany({ where: { email: { contains: slug } } })
    await prisma.product.deleteMany({ where: { slug: { startsWith: 'smoke-review-product-' } } })
    await prisma.category.deleteMany({ where: { slug: { startsWith: 'smoke-review-category-' } } })
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