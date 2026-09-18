import type { QuoteDeliveryFeeMode } from '../services/quoteService'
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

/** "3–5 days", "2 days", or null when the quotation has no lead time. */
export function formatQuoteDayRange(minDays: number | null, maxDays: number | null): string | null {
  if (minDays === null && maxDays === null) return null
  const lower = minDays ?? maxDays
  const upper = maxDays ?? minDays
  if (lower === upper) return `${lower} day${lower === 1 ? '' : 's'}`
  return `${lower}–${upper} days`
}

/**
 * Label for the delivery-fee line of a quotation, describing how the fee was
 * set during preparation rather than only showing the amount.
 */
export function quoteFeeLabel(
  fulfillmentMethod: FulfillmentMethod | null,
  deliveryFeeMode: QuoteDeliveryFeeMode,
  deliveryAreaName: string | null,
): string {
  if (fulfillmentMethod === 'PICKUP') return 'Delivery (pickup)'
  if (deliveryFeeMode === 'FREE') return 'Delivery (free)'
  if (deliveryFeeMode === 'CUSTOM') return 'Delivery fee (fixed)'
  if (deliveryFeeMode === 'ZONE') return deliveryAreaName ? `Delivery (from ${deliveryAreaName})` : 'Delivery (from your zone)'
  return 'Delivery fee'
}
