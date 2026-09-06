import type { OrderStatus, PaymentStatus, ReviewStatus } from '@prisma/client'
import type { HomepageFeaturedMetrics } from '../customer-stories/customer-stories.types.js'

export type AdminReviewStatusFilter = 'pending' | 'approved' | 'rejected'

export interface AdminReviewsQuery {
  page: number
  pageSize: number
  search?: string
  status?: AdminReviewStatusFilter
  verified?: 'verified' | 'not-verified'
  rating?: number
}

export interface AdminReviewItem {
  id: string
  productId: string
  productName: string
  productSlug: string
  productImage: string
  productOptionLabel: string | null
  customerId: string | null
  customerName: string | null
  orderNumber: string
  rating: number
  content: string
  status: ReviewStatus
  verifiedPurchase: boolean
  isActive: boolean
  isFeatured: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface AdminReviewDetail extends AdminReviewItem {
  customerEmail: string | null
  productQuantity: number
  orderCreatedAt: string
}

export interface AdminReviewsPage {
  reviews: AdminReviewItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  featured: HomepageFeaturedMetrics
}

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

export interface RatingDistribution {
  '1': number
  '2': number
  '3': number
  '4': number
  '5': number
}

export interface PublicProductReviewSummary {
  averageRating: number | null
  reviewCount: number
  distribution: RatingDistribution
}

export interface PublicReviewItem {
  id: string
  authorName: string
  rating: number
  content: string
  createdAt: string
  verifiedPurchase: boolean
}

export interface ProductReviewAction {
  orderNumber: string
  orderItemId: string
  productName: string
}

export interface PublicProductReviews {
  productId: string
  productName: string
  summary: PublicProductReviewSummary
  items: PublicReviewItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  reviewAction: ProductReviewAction | null
}

export interface PublicProductReviewsQuery {
  page: number
  limit: number
}