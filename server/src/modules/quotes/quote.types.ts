import type { DeliveryFeeMode, FulfillmentMethod, QuoteRequestStatus, ShoppingMode } from '@prisma/client'

export interface CreateQuoteRequestInput {
  requestKey: string
  customerName: string
  customerEmail: string
  customerPhone: string
  message?: string
  fulfillmentMethod?: FulfillmentMethod
  state?: string
  stateId?: string
  city?: string
  cityId?: string
  areaId?: string
  deliveryAddress?: string
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

/**
 * Current catalog prices attached to an admin quote item. Used purely as a
 * pricing hint while preparing a quotation — the saved snapshot is the value
 * in `quotedUnitPrice`, never these live prices.
 */
export interface QuotePriceHint {
  retail: string | null
  wholesale: string | null
}

export interface AdminQuoteRequestItem extends QuoteRequestItemResponse {
  priceHint: QuotePriceHint
}

export interface QuotePricingItemInput {
  itemId: string
  quotedUnitPrice: string
}

export interface PrepareQuotePricingInput {
  items: QuotePricingItemInput[]
  deliveryFee: string | null
  fulfillmentMethod: FulfillmentMethod
  // Decides how the delivery fee is locked at preparation time. ZONE resolves
  // it from the customer's chosen delivery zone, FREE locks a fee of zero and
  // CUSTOM uses the supplied deliveryFee amount. Absent (legacy) keeps the fee
  // resolved from the delivery zone at checkout.
  deliveryFeeMode?: 'ZONE' | 'FREE' | 'CUSTOM'
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
  state: string | null
  city: string | null
  deliveryAddress: string | null
  stateId: string | null
  cityId: string | null
  areaId: string | null
  deliveryFeeMode: DeliveryFeeMode | null
  deliveryZoneId: string | null
  deliveryZoneName: string | null
  deliveryAreaName: string | null
  deliveryMinDays: number | null
  deliveryMaxDays: number | null
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
  fulfillmentMethod: FulfillmentMethod | null
  status: QuoteRequestStatus
  createdAt: string
  updatedAt: string
}

export interface AdminQuoteRequest extends AdminQuoteRequestListItem {
  message: string | null
  adminNote: string | null
  fulfillmentMethod: FulfillmentMethod | null
  state: string | null
  city: string | null
  deliveryAddress: string | null
  deliveryFeeMode: DeliveryFeeMode | null
  deliveryZoneId: string | null
  deliveryZoneName: string | null
  deliveryAreaId: string | null
  deliveryAreaName: string | null
  deliveryMinDays: number | null
  deliveryMaxDays: number | null
  quotedSubtotal: string | null
  deliveryFee: string | null
  quotedTotal: string | null
  quotedAt: string | null
  acceptedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  cancelledAt: string | null
  cancelledReason: string | null
  completedAt: string | null
  convertedOrderNumber: string | null
  items: AdminQuoteRequestItem[]
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