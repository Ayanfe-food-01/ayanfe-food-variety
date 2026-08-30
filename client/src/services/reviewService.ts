import { request } from './api'
import type { CustomerPaymentStatus, OrderStatus } from './orderService'

export interface ReviewEligibilityItem {
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

export interface ReviewEligibility {
  orderNumber: string
  orderStatus: OrderStatus
  paymentStatus: CustomerPaymentStatus
  items: ReviewEligibilityItem[]
}

export interface SubmittedReview {
  id: string
  productId: string
  orderId: string
  orderItemId: string
  rating: number
  content: string
  status: 'PENDING'
  verifiedPurchase: boolean
  createdAt: string
}

interface ReviewEligibilityResponse {
  success: true
  data: { eligibility: ReviewEligibility }
}

interface SubmitReviewResponse {
  success: true
  data: { review: SubmittedReview }
}

export async function getOrderReviewEligibility(orderNumber: string): Promise<ReviewEligibility> {
  const response = await request<ReviewEligibilityResponse>(
    `/orders/${encodeURIComponent(orderNumber)}/review-eligibility`,
  )
  return response.data.eligibility
}

export async function submitProductReview(
  orderNumber: string,
  input: { orderItemId: string; rating: number; content: string },
): Promise<SubmittedReview> {
  const response = await request<SubmitReviewResponse>(`/orders/${encodeURIComponent(orderNumber)}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data.review
}