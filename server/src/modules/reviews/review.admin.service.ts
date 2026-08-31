import { Prisma, ReviewStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import {
  assertHomepageFeaturedCapacity,
  getHomepageFeaturedMetrics,
} from '../customer-stories/customer-stories.service.js'
import type {
  AdminReviewDetail,
  AdminReviewItem,
  AdminReviewsPage,
  AdminReviewsQuery,
} from './review.types.js'

const adminReviewInclude = {
  user: { select: { id: true, name: true, email: true } },
  product: { select: { id: true, name: true, slug: true, image: true } },
  order: { select: { orderNumber: true, createdAt: true } },
  orderItem: { select: { productName: true, productOptionLabel: true, quantity: true } },
} satisfies Prisma.ReviewInclude

type AdminReviewRow = Prisma.ReviewGetPayload<{ include: typeof adminReviewInclude }>

const toAdminReviewItem = (review: AdminReviewRow): AdminReviewItem => ({
  id: review.id,
  productId: review.productId,
  productName: review.product.name,
  productSlug: review.product.slug,
  productImage: review.product.image,
  productOptionLabel: review.orderItem.productOptionLabel,
  customerId: review.user?.id ?? null,
  customerName: review.user?.name ?? null,
  orderNumber: review.order.orderNumber,
  rating: review.rating,
  content: review.content,
  status: review.status,
  verifiedPurchase: review.verifiedPurchase,
  isActive: review.isActive,
  isFeatured: review.isFeatured,
  displayOrder: review.displayOrder,
  createdAt: review.createdAt.toISOString(),
  updatedAt: review.updatedAt.toISOString(),
})

const toAdminReviewDetail = (review: AdminReviewRow): AdminReviewDetail => ({
  ...toAdminReviewItem(review),
  customerEmail: review.user?.email ?? null,
  productQuantity: review.orderItem.quantity,
  orderCreatedAt: review.order.createdAt.toISOString(),
})

export async function listAdminReviews(query: AdminReviewsQuery): Promise<AdminReviewsPage> {
  const where: Prisma.ReviewWhereInput = {
    ...(query.search
      ? {
          OR: [
            { user: { name: { contains: query.search, mode: 'insensitive' } } },
            { product: { name: { contains: query.search, mode: 'insensitive' } } },
            { content: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(query.status ? { status: query.status.toUpperCase() as ReviewStatus } : {}),
    ...(query.verified ? { verifiedPurchase: query.verified === 'verified' } : {}),
    ...(query.rating !== undefined ? { rating: query.rating } : {}),
  }

  const [total, reviews] = await prisma.$transaction([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      include: adminReviewInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])

  return {
    reviews: reviews.map(toAdminReviewItem),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
    featured: await getHomepageFeaturedMetrics(),
  }
}

export async function getAdminReview(id: string): Promise<AdminReviewDetail> {
  const review = await prisma.review.findUnique({ where: { id }, include: adminReviewInclude })
  if (!review) throw new HttpError(404, 'Review not found.')
  return toAdminReviewDetail(review)
}

export async function updateReviewStatus(
  id: string,
  status: 'APPROVED' | 'REJECTED',
): Promise<AdminReviewDetail> {
  const review = await getAdminReview(id)
  if (review.status === status) {
    throw new HttpError(409, status === 'APPROVED'
      ? 'This review has already been approved.'
      : 'This review has already been rejected.')
  }

  const wasDisplayed = review.isActive && review.isFeatured && review.status === ReviewStatus.APPROVED
  const willBeDisplayed = review.isActive && review.isFeatured && status === 'APPROVED'
  if (willBeDisplayed && !wasDisplayed) {
    await assertHomepageFeaturedCapacity()
  }

  try {
    const updated = await prisma.review.update({
      where: { id },
      data: status === 'REJECTED' ? { status, isFeatured: false } : { status },
      include: adminReviewInclude,
    })
    return toAdminReviewDetail(updated)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Review not found.')
    }
    throw error
  }
}

export async function updateReviewFeatured(
  id: string,
  isFeatured: boolean,
): Promise<AdminReviewDetail> {
  const review = await getAdminReview(id)
  if (isFeatured && review.status !== ReviewStatus.APPROVED) {
    throw new HttpError(409, 'Only approved reviews can be featured on the homepage.')
  }
  if (isFeatured && review.isActive && !review.isFeatured) {
    await assertHomepageFeaturedCapacity()
  }

  try {
    const updated = await prisma.review.update({
      where: { id },
      data: { isFeatured },
      include: adminReviewInclude,
    })
    return toAdminReviewDetail(updated)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Review not found.')
    }
    throw error
  }
}

export async function updateReviewDisplayOrder(id: string, displayOrder: number): Promise<AdminReviewDetail> {
  const review = await getAdminReview(id)
  if (review.displayOrder === displayOrder) return review

  try {
    const updated = await prisma.review.update({
      where: { id },
      data: { displayOrder },
      include: adminReviewInclude,
    })
    return toAdminReviewDetail(updated)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Review not found.')
    }
    throw error
  }
}

export async function deleteReview(id: string): Promise<void> {
  await getAdminReview(id)
  try {
    await prisma.review.delete({ where: { id } })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Review not found.')
    }
    throw error
  }
}