import { OrderStatus, PaymentStatus, ReviewStatus } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type {
  ProductReviewAction,
  PublicProductReviews,
  PublicProductReviewsQuery,
  PublicReviewItem,
  RatingDistribution,
  PublicProductReviewSummary,
} from './review.types.js'

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