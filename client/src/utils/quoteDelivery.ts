import type { FulfillmentMethod } from '../services/orderService'
import { formatPrice } from './formatPrice'

/**
 * Delivery-fee presentation for a quotation. A null fee means the fee is not
 * part of the quotation and is calculated from the customer's delivery zone at
 * checkout; a value is either an admin override or `0` (free).
 */
export function formatQuoteDeliveryFee(
  fulfillmentMethod: FulfillmentMethod | null,
  deliveryFee: string | null,
): string {
  if (fulfillmentMethod === 'PICKUP') return 'Free'
  if (deliveryFee === null) return 'Calculated at checkout'
  return Number(deliveryFee) === 0 ? 'Free' : formatPrice(deliveryFee)
}
