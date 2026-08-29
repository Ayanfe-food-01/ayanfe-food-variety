import { request } from './api'

export type QuoteRequestStatus = 'PENDING' | 'CONTACTED' | 'QUOTED' | 'COMPLETED' | 'CANCELLED'
export type QuoteShoppingMode = 'RETAIL' | 'WHOLESALE' | null

export interface QuoteRequestItem {
  id: string
  productId: string
  productName: string
  productOptionId: string | null
  productOptionLabel: string | null
  quantity: number
  note: string | null
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
  items: QuoteRequestItem[]
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