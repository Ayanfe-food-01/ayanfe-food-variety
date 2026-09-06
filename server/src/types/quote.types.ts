import type { FulfillmentMethod, QuoteRequestStatus, ShoppingMode } from '@prisma/client'

export interface CreateQuoteRequestInput {
  requestKey: string
  customerName: string
  customerEmail: string
  customerPhone: string
  message?: string
  items: Array<{
    productId: string
    productOptionId: string | null
    quantity: number
    note?: string
  }>
}

export interface QuoteRequestItemResponse {
  id: string
  productId: string
  productName: string
  productOptionId: string | null
  productOptionLabel: string | null
  quantity: number
  note: string | null
  quotedUnitPrice: string | null
}

export interface QuotePricingItemInput {
  itemId: string
  quotedUnitPrice: string
}

export interface PrepareQuotePricingInput {
  items: QuotePricingItemInput[]
  deliveryFee: string
  fulfillmentMethod: FulfillmentMethod
}

/**
 * Public quote request representation. Internal administration fields such as
 * the admin note and the customer's decline reason are deliberately never
 * serialized here. Pricing fields are nullable and only populated once an
 * admin has prepared a quotation.
 */
export interface QuoteRequestResponse {
  id: string
  quoteNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  message: string | null
  shoppingMode: ShoppingMode | null
  status: QuoteRequestStatus
  fulfillmentMethod: FulfillmentMethod | null
  quotedSubtotal: string | null
  deliveryFee: string | null
  quotedTotal: string | null
  quotedAt: string | null
  acceptedAt: string | null
  rejectedAt: string | null
  convertedOrderNumber: string | null
  createdAt: string
  updatedAt: string
  items: QuoteRequestItemResponse[]
}

export interface ApplyQuoteRequestResult {
  quoteRequest: QuoteRequestResponse
  created: boolean
}

export interface AdminQuoteRequestListItem {
  id: string
  quoteNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  itemCount: number
  shoppingMode: ShoppingMode | null
  status: QuoteRequestStatus
  createdAt: string
  updatedAt: string
}

export interface AdminQuoteRequest extends AdminQuoteRequestListItem {
  message: string | null
  adminNote: string | null
  fulfillmentMethod: FulfillmentMethod | null
  quotedSubtotal: string | null
  deliveryFee: string | null
  quotedTotal: string | null
  quotedAt: string | null
  acceptedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  convertedOrderNumber: string | null
  items: QuoteRequestItemResponse[]
}

export interface QuoteRequestQuery {
  search?: string
  status?: QuoteRequestStatus
  sort: 'newest' | 'oldest'
  page: number
  pageSize: number
}

export interface QuoteRequestPage {
  quoteRequests: AdminQuoteRequestListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/**
 * Customer-facing summary of a signed-in customer's quote requests. The full
 * response (with items) is only loaded for a single request.
 */
export interface CustomerQuoteRequestListItem {
  id: string
  quoteNumber: string
  shoppingMode: ShoppingMode | null
  status: QuoteRequestStatus
  itemCount: number
  quotedTotal: string | null
  quotedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CustomerQuoteRequestsResult {
  quoteRequests: CustomerQuoteRequestListItem[]
}

export interface RejectQuoteRequestInput {
  reason?: string
}