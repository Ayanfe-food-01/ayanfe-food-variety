import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type {
  OrderReviewEligibility,
  OrderReviewEligibilityItem,
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