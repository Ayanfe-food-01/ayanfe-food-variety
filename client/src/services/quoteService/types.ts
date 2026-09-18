import type { PaymentMethod } from '../orderService'

export type QuoteRequestStatus = 'PENDING' | 'CONTACTED' | 'QUOTED' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED'
export type QuoteShoppingMode = 'RETAIL' | 'WHOLESALE' | null
export type QuoteFulfillmentMethod = 'PICKUP' | 'DELIVERY'
export type QuoteDeliveryFeeMode = 'ZONE' | 'FREE' | 'CUSTOM' | null

export interface QuoteRequestItem {
  id: string
  productId: string
  productName: string
  productOptionId: string | null
  productOptionLabel: string | null
  quantity: number
  note: string | null
  quotedUnitPrice: string | null
}

export interface QuotePriceHint {
  retail: string | null
  wholesale: string | null
}

export interface AdminQuoteRequestItem extends QuoteRequestItem {
  priceHint: QuotePriceHint
}

export interface QuoteRequest {
  id: string
  quoteNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  message: string | null
  shoppingMode: QuoteShoppingMode
  status: QuoteRequestStatus
  fulfillmentMethod: QuoteFulfillmentMethod | null
  state: string | null
  city: string | null
  deliveryAddress: string | null
  stateId: string | null
  cityId: string | null
  areaId: string | null
  deliveryFeeMode: QuoteDeliveryFeeMode
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
  items: QuoteRequestItem[]
}

export interface CreateQuoteRequestInput {
  requestKey: string
  customerName: string
  customerEmail: string
  customerPhone: string
  message?: string
  fulfillmentMethod?: QuoteFulfillmentMethod
  state?: string
  stateId?: string
  city?: string
  cityId?: string
  areaId?: string
  deliveryAddress?: string
  items: Array<{
    productId: string
    productOptionId?: string | null
    quantity: number
    note?: string
  }>
}

export interface AdminQuoteRequestListItem {
  id: string
  quoteNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  itemCount: number
  shoppingMode: QuoteShoppingMode
  fulfillmentMethod: QuoteFulfillmentMethod | null
  status: QuoteRequestStatus
  createdAt: string
  updatedAt: string
}

export interface AdminQuoteRequestDetail extends AdminQuoteRequestListItem {
  message: string | null
  adminNote: string | null
  fulfillmentMethod: QuoteFulfillmentMethod | null
  state: string | null
  city: string | null
  deliveryAddress: string | null
  deliveryFeeMode: QuoteDeliveryFeeMode
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

export interface PrepareQuotePricingInput {
  items: Array<{ itemId: string; quotedUnitPrice: string }>
  // Empty/null means the delivery fee is calculated from the customer's
  // delivery zone at checkout (legacy behaviour). A value locks it as an
  // override.
  deliveryFee: string
  fulfillmentMethod: QuoteFulfillmentMethod
  // ZONE resolves and locks the customer's zone fee, FREE locks zero and
  // CUSTOM locks the supplied deliveryFee amount. Absent keeps legacy.
  deliveryFeeMode?: 'ZONE' | 'FREE' | 'CUSTOM'
}

export interface AdminQuoteRequestsQuery {
  search?: string
  status?: QuoteRequestStatus
  sort?: 'newest' | 'oldest'
  page?: number
  pageSize?: number
}

export interface AdminQuoteRequestsPage {
  quoteRequests: AdminQuoteRequestListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface CustomerQuoteRequestListItem {
  id: string
  quoteNumber: string
  shoppingMode: QuoteShoppingMode
  status: QuoteRequestStatus
  itemCount: number
  quotedTotal: string | null
  quotedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ConvertQuoteToOrderInput {
  whatsapp?: string
  deliveryAddress?: string
  city?: string
  stateId?: string
  cityId?: string
  areaId?: string
  deliveryInstructions?: string
  paymentMethod?: PaymentMethod
}