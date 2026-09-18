import { request } from '../api'
import type {
  CreateQuoteRequestInput,
  CustomerQuoteRequestListItem,
  QuoteRequest,
} from './types'

interface CreateQuoteRequestResponse {
  success: true
  message: string
  data: { quoteRequest: QuoteRequest; created: boolean }
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

export async function createQuoteRequest(input: CreateQuoteRequestInput): Promise<{ quoteRequest: QuoteRequest; created: boolean }> {
  const response = await request<CreateQuoteRequestResponse>('/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data
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