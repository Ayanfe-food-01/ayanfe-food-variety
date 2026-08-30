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

export interface ProductRatingDistribution {
  '1': number
  '2': number
  '3': number
  '4': number
  '5': number
}

export interface ProductReviewSummary {
  averageRating: number | null
  reviewCount: number
  distribution: ProductRatingDistribution
}

export interface ProductReviewAction {
  orderNumber: string
  orderItemId: string
  productName: string
}

export interface ProductReviewItem {
  id: string
  authorName: string
  rating: number
  content: string
  createdAt: string
  verifiedPurchase: boolean
}

export interface ProductReviewsData {
  productId: string
  productName: string
  summary: ProductReviewSummary
  items: ProductReviewItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  reviewAction: ProductReviewAction | null
}

interface ProductReviewsResponse {
  success: true
  data: ProductReviewsData
}

const isWholeRating = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5

const validateSummary = (summary: unknown): ProductReviewSummary => {
  if (!summary || typeof summary !== 'object') throw new Error('The review data is invalid.')
  const record = summary as Record<string, unknown>
  const averageRating = record.averageRating
  if (
    averageRating !== null
    && (!isWholeRating(averageRating) && (typeof averageRating !== 'number' || !Number.isFinite(averageRating) || averageRating < 1 || averageRating > 5))
  ) {
    throw new Error('The review data is invalid.')
  }
  const reviewCount = record.reviewCount
  if (typeof reviewCount !== 'number' || !Number.isInteger(reviewCount) || reviewCount < 0) {
    throw new Error('The review data is invalid.')
  }
  const distribution = record.distribution
  if (!distribution || typeof distribution !== 'object') throw new Error('The review data is invalid.')
  const counts = distribution as Record<string, unknown>
  for (const star of ['1', '2', '3', '4', '5']) {
    if (typeof counts[star] !== 'number' || !Number.isInteger(counts[star]) || counts[star] < 0) {
      throw new Error('The review data is invalid.')
    }
  }
  return { averageRating: averageRating as number | null, reviewCount, distribution: distribution as ProductRatingDistribution }
}

const toProductReviewItem = (item: unknown): ProductReviewItem => {
  if (!item || typeof item !== 'object') throw new Error('The review data is invalid.')
  const record = item as Record<string, unknown>
  if (
    typeof record.id !== 'string'
    || typeof record.authorName !== 'string'
    || typeof record.content !== 'string'
    || !isWholeRating(record.rating)
    || typeof record.createdAt !== 'string'
    || typeof record.verifiedPurchase !== 'boolean'
  ) {
    throw new Error('The review data is invalid.')
  }
  return {
    id: record.id,
    authorName: record.authorName,
    rating: record.rating,
    content: record.content,
    createdAt: record.createdAt,
    verifiedPurchase: record.verifiedPurchase,
  }
}

export async function getProductReviews(
  id: string,
  query: { page?: number; limit?: number } = {},
): Promise<ProductReviewsData> {
  const params = new URLSearchParams()
  if (query.page && query.page > 1) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  const queryString = params.toString()
  const response = await request<ProductReviewsResponse>(
    `/products/${encodeURIComponent(id)}/reviews${queryString ? `?${queryString}` : ''}`,
  )
  const data = response.data
  const reviewAction = data.reviewAction
  if (
    typeof data.productId !== 'string'
    || typeof data.productName !== 'string'
    || !Array.isArray(data.items)
    || !data.pagination
    || typeof data.pagination.total !== 'number'
    || typeof data.pagination.totalPages !== 'number'
    || (reviewAction !== null && (!reviewAction || typeof reviewAction.orderNumber !== 'string' || typeof reviewAction.orderItemId !== 'string'))
  ) {
    throw new Error('The review data is invalid.')
  }
  return {
    productId: data.productId,
    productName: data.productName,
    summary: validateSummary(data.summary),
    items: data.items.map(toProductReviewItem),
    pagination: data.pagination,
    reviewAction,
  }
}