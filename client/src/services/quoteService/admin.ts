import { request } from '../api'
import type {
  AdminQuoteRequestDetail,
  AdminQuoteRequestsPage,
  AdminQuoteRequestsQuery,
  PrepareQuotePricingInput,
  QuoteRequestStatus,
} from './types'

interface AdminQuoteRequestsResponse {
  success: true
  data: AdminQuoteRequestsPage
}

interface AdminQuoteRequestResponse {
  success: true
  message?: string
  data: { quoteRequest: AdminQuoteRequestDetail }
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
  reason?: string,
): Promise<AdminQuoteRequestDetail> {
  const response = await request<AdminQuoteRequestResponse>(`/admin/quotes/${encodeURIComponent(reference)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reason !== undefined && reason !== '' ? { status, reason } : { status }),
  })
  return response.data.quoteRequest
}

export async function reviseAdminQuoteRequest(reference: string): Promise<AdminQuoteRequestDetail> {
  const response = await request<AdminQuoteRequestResponse>(`/admin/quotes/${encodeURIComponent(reference)}/revise`, {
    method: 'POST',
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