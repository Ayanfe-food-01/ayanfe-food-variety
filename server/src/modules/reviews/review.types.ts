import type { OrderStatus, PaymentStatus, ReviewStatus } from '@prisma/client'

export interface ReviewCreateInput {
  orderItemId: string
  rating: number
  content: string
}

export interface ReviewResponse {
  id: string
  productId: string
  orderId: string
  orderItemId: string
  rating: number
  content: string
  status: ReviewStatus
  verifiedPurchase: boolean
  createdAt: string
}

export interface OrderReviewEligibilityItem {
  id: string
  productId: string
  productName: string
  productOptionLabel: string | null
  productImage: string
  quantity: number
  canReview: boolean
  reviewed: boolean
  reviewId: string | null
  reviewRating: number | null
}

export interface OrderReviewEligibility {
  orderNumber: string
  orderStatus: OrderStatus
  paymentStatus: 'PENDING' | 'PAID' | 'REJECTED'
  items: OrderReviewEligibilityItem[]
}