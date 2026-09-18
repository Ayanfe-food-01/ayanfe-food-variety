import { request } from '../api'
import type { CreatedOrder } from '../orderService'
import type { ConvertQuoteToOrderInput } from './types'

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