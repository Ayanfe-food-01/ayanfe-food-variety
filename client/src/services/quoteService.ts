import { request } from './api'
import type { CreatedOrder } from './orderService'

export type QuoteRequestStatus = 'PENDING' | 'CONTACTED' | 'QUOTED' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED'
export type QuoteShoppingMode = 'RETAIL' | 'WHOLESALE' | null
export type QuoteFulfillmentMethod = 'PICKUP' | 'DELIVERY'

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
  items: Array<{
    productId: string
    productOptionId?: string | null
    quantity: number
    note?: string
  }>
}

interface CreateQuoteRequestResponse {
  success: true
  message: string
  data: { quoteRequest: QuoteRequest }
}

export interface AdminQuoteRequestListItem {
  id: string
  quoteNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  itemCount: number
  shoppingMode: QuoteShoppingMode
  status: QuoteRequestStatus
  createdAt: string
  updatedAt: string
}

export interface AdminQuoteRequestDetail extends AdminQuoteRequestListItem {
  message: string | null
  adminNote: string | null
  fulfillmentMethod: QuoteFulfillmentMethod | null
  quotedSubtotal: string | null
  deliveryFee: string | null
  quotedTotal: string | null
  quotedAt: string | null
  acceptedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  convertedOrderNumber: string | null
  items: QuoteRequestItem[]
}

export interface PrepareQuotePricingInput {
  items: Array<{ itemId: string; quotedUnitPrice: string }>
  deliveryFee: string
  fulfillmentMethod: QuoteFulfillmentMethod
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

interface AdminQuoteRequestsResponse {
  success: true
  data: AdminQuoteRequestsPage
}

interface AdminQuoteRequestResponse {
  success: true
  message?: string
  data: { quoteRequest: AdminQuoteRequestDetail }
}

export async function createQuoteRequest(input: CreateQuoteRequestInput): Promise<QuoteRequest> {
  const response = await request<CreateQuoteRequestResponse>('/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data.quoteRequest
}

export async function getAdminQuoteRequests(query: AdminQuoteRequestsQuery = {}): Promise<AdminQuoteRequestsPage> {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const response = await request<AdminQuoteRequestsResponse>(`/admin/quotes${params.size ? `?${params.toString()}` : ''}`)
  return response.data
}

export async function getAdminQuoteRequest(reference: string): Promise<AdminQuoteRequestDetail> {
  const response = await request<AdminQuoteRequestResponse>(`/admin/quotes/${encodeURIComponent(reference)}`)
  return response.data.quoteRequest
}

export async function updateAdminQuoteRequestStatus(
  reference: string,
  status: QuoteRequestStatus,
): Promise<AdminQuoteRequestDetail> {
  const response = await request<AdminQuoteRequestResponse>(`/admin/quotes/${encodeURIComponent(reference)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  return response.data.quoteRequest
}

export async function updateAdminQuoteRequestNote(
  reference: string,
  note: string,
): Promise<AdminQuoteRequestDetail> {
  const response = await request<AdminQuoteRequestResponse>(`/admin/quotes/${encodeURIComponent(reference)}/note`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  })
  return response.data.quoteRequest
}

export async function prepareAdminQuotePricing(
  reference: string,
  input: PrepareQuotePricingInput,
): Promise<AdminQuoteRequestDetail> {
  const response = await request<AdminQuoteRequestResponse>(`/admin/quotes/${encodeURIComponent(reference)}/price`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data.quoteRequest
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

interface CustomerQuoteRequestsResponse {
  success: true
  data: { quoteRequests: CustomerQuoteRequestListItem[] }
}

interface QuoteRequestResponse {
  success: true
  message?: string
  data: { quoteRequest: QuoteRequest }
}

export async function listCustomerQuoteRequests(): Promise<CustomerQuoteRequestListItem[]> {
  const response = await request<CustomerQuoteRequestsResponse>('/quotes')
  return response.data.quoteRequests
}

export async function getCustomerQuoteRequest(reference: string): Promise<QuoteRequest> {
  const response = await request<QuoteRequestResponse>(`/quotes/${encodeURIComponent(reference)}`)
  return response.data.quoteRequest
}

export async function acceptCustomerQuoteRequest(reference: string): Promise<QuoteRequest> {
  const response = await request<QuoteRequestResponse>(`/quotes/${encodeURIComponent(reference)}/accept`, {
    method: 'POST',
  })
  return response.data.quoteRequest
}

export async function rejectCustomerQuoteRequest(
  reference: string,
  reason?: string,
): Promise<QuoteRequest> {
  const response = await request<QuoteRequestResponse>(`/quotes/${encodeURIComponent(reference)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reason ? { reason } : {}),
  })
  return response.data.quoteRequest
}

export interface ConvertQuoteToOrderInput {
  whatsapp?: string
  deliveryAddress?: string
  city?: string
  deliveryInstructions?: string
}

interface ConvertQuoteResponse {
  success: true
  message: string
  data: { order: CreatedOrder }
}

export async function convertQuoteToOrder(
  reference: string,
  input: ConvertQuoteToOrderInput = {},
): Promise<CreatedOrder> {
  const response = await request<ConvertQuoteResponse>(`/quotes/${encodeURIComponent(reference)}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data.order
}