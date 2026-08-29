import type { QuoteRequestStatus, ShoppingMode } from '@prisma/client'

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
}

/**
 * Public quote request representation. Internal administration fields such as
 * the admin note are deliberately never serialized here.
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