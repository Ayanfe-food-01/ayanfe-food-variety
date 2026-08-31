import { OrderStatus, PaymentStatus, Prisma, ReviewStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type {
  OrderReviewEligibility,
  OrderReviewEligibilityItem,
  ProductReviewAction,
  PublicProductReviewSummary,
  PublicProductReviews,
  PublicProductReviewsQuery,
  PublicReviewItem,
  RatingDistribution,
  ReviewCreateInput,
  ReviewResponse,
} from './review.types.js'

type ReviewRow = {
  id: string
  productId: string
  orderId: string
  orderItemId: string
  rating: number
  content: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  verifiedPurchase: boolean
  createdAt: Date
}

const toReviewResponse = (review: ReviewRow): ReviewResponse => ({
  id: review.id,
  productId: review.productId,
  orderId: review.orderId,
  orderItemId: review.orderItemId,
  rating: review.rating,
  content: review.content,
  status: review.status,
  verifiedPurchase: review.verifiedPurchase,
  createdAt: review.createdAt.toISOString(),
})

const eligibilityInclude = {
  orderItems: {
    include: {
      product: { select: { image: true } },
      reviews: { select: { id: true, rating: true } },
    },
  },
} satisfies Prisma.OrderInclude

type EligibilityOrder = Prisma.OrderGetPayload<{ include: typeof eligibilityInclude }>

const orderQualifiesForReview = (order: { paymentStatus: PaymentStatus; orderStatus: OrderStatus; archivedAt: Date | null }): boolean =>
  order.paymentStatus === PaymentStatus.PAID
    && order.orderStatus === OrderStatus.DELIVERED
    && order.archivedAt === null

const toEligibilityItem = (
  item: EligibilityOrder['orderItems'][number],
  qualifies: boolean,
): OrderReviewEligibilityItem => {
  const existingReview = item.reviews[0]
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    productOptionLabel: item.productOptionLabel,
    productImage: item.product.image,
    quantity: item.quantity,
    canReview: qualifies && !existingReview,
    reviewed: Boolean(existingReview),
    reviewId: existingReview?.id ?? null,
    reviewRating: existingReview?.rating ?? null,
  }
}

export async function getOrderReviewEligibility(
  userId: string,
  orderNumber: string,
): Promise<OrderReviewEligibility> {
  const order = await prisma.order.findFirst({
    where: { orderNumber, userId },
    include: eligibilityInclude,
  })
  if (!order) throw new HttpError(404, 'Order not found.')

  const qualifies = orderQualifiesForReview(order)

  return {
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus === PaymentStatus.FAILED ? 'REJECTED' : order.paymentStatus,
    items: order.orderItems.map((item) => toEligibilityItem(item, qualifies)),
  }
}

export async function submitProductReview(
  userId: string,
  orderNumber: string,
  input: ReviewCreateInput,
): Promise<ReviewResponse> {
  const order = await prisma.order.findFirst({
    where: { orderNumber, userId },
    include: {
      orderItems: {
        include: { reviews: { select: { id: true } } },
      },
    },
  })
  if (!order) throw new HttpError(404, 'Order not found.')
  if (!orderQualifiesForReview(order)) {
    throw new HttpError(403, 'Reviews can only be submitted for delivered, paid orders.')
  }
  if (order.archivedAt) throw new HttpError(403, 'This order is no longer active.')

  const orderItem = order.orderItems.find((item) => item.id === input.orderItemId)
  if (!orderItem) throw new HttpError(403, 'The order item does not belong to this order.')
  if (orderItem.reviews.length > 0) {
    throw new HttpError(409, 'You have already reviewed this item in this order.')
  }

  try {
    const review = await prisma.review.create({
      data: {
        productId: orderItem.productId,
        userId,
        orderId: order.id,
        orderItemId: orderItem.id,
        rating: input.rating,
        content: input.content,
        status: 'PENDING',
        verifiedPurchase: true,
      },
    })
    return toReviewResponse(review)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'You have already reviewed this item in this order.')
    }
    throw error
  }
}

const REVIEWABLE_PRODUCT_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function resolvePublicReviewableProduct(
  identifier: string,
): Promise<{ id: string; name: string } | null> {
  const isUuid = REVIEWABLE_PRODUCT_PATTERN.test(identifier)
  return prisma.product.findFirst({
    where: isUuid
      ? { isActive: true, category: { isActive: true }, OR: [{ id: identifier }, { slug: identifier }] }
      : { isActive: true, category: { isActive: true }, slug: identifier },
    select: { id: true, name: true },
  })
}

const roundRatingToTenths = (value: number): number => Math.round(value * 10) / 10

export async function getPublicProductReviews(
  identifier: string,
  query: PublicProductReviewsQuery,
  userId?: string,
): Promise<PublicProductReviews> {
  const product = await resolvePublicReviewableProduct(identifier)
  if (!product) throw new HttpError(404, 'Product not found.')

  const [ratingGroups, reviewAction] = await Promise.all([
    prisma.review.groupBy({
      by: ['rating'],
      where: { productId: product.id, status: ReviewStatus.APPROVED },
      _count: { _all: true },
    }),
    userId ? findEligibleReviewAction(product.id, userId) : Promise.resolve(null),
  ])

  const distribution: RatingDistribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  let total = 0
  let weightedSum = 0
  for (const group of ratingGroups) {
    distribution[String(group.rating) as keyof RatingDistribution] = group._count._all
    total += group._count._all
    weightedSum += group.rating * group._count._all
  }

  const summary: PublicProductReviewSummary = {
    averageRating: total > 0 ? roundRatingToTenths(weightedSum / total) : null,
    reviewCount: total,
    distribution,
  }

  const reviews = total > 0
    ? await prisma.review.findMany({
        where: { productId: product.id, status: ReviewStatus.APPROVED },
        include: { user: { select: { name: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      })
    : []

  const items: PublicReviewItem[] = reviews.map((review) => ({
    id: review.id,
    authorName: review.user?.name ?? 'Verified Customer',
    rating: review.rating,
    content: review.content,
    createdAt: review.createdAt.toISOString(),
    verifiedPurchase: review.verifiedPurchase,
  }))

  return {
    productId: product.id,
    productName: product.name,
    summary,
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
    reviewAction,
  }
}

async function findEligibleReviewAction(productId: string, userId: string): Promise<ProductReviewAction | null> {
  const orderItem = await prisma.orderItem.findFirst({
    where: {
      productId,
      reviews: { none: {} },
      order: {
        userId,
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.DELIVERED,
        archivedAt: null,
      },
    },
    orderBy: { order: { createdAt: 'desc' } },
    select: {
      id: true,
      order: { select: { orderNumber: true } },
      product: { select: { name: true } },
    },
  })
  if (!orderItem) return null

  return {
    orderNumber: orderItem.order.orderNumber,
    orderItemId: orderItem.id,
    productName: orderItem.product.name,
  }
}