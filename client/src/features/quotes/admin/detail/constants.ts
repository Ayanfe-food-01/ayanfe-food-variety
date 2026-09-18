import type { QuoteDeliveryFeeMode, QuoteRequestStatus } from '../../../../services/quoteService'

export type QuoteFulfillmentOption = 'PICKUP' | 'DELIVERY'
export type QuoteDeliveryFeeOption = 'ZONE' | 'FREE' | 'CUSTOM'

// Resolves the editable fee mode for a saved quotation. Quotes prepared before
// modes existed have a null mode: a stored fee then implies a custom amount and
// no stored fee means the zone rate.
export const deliveryFeeModeFromQuote = (
  mode: QuoteDeliveryFeeMode,
  fee: string | null,
): QuoteDeliveryFeeOption => {
  if (mode === 'ZONE' || mode === 'FREE' || mode === 'CUSTOM') return mode
  if (fee === null) return 'ZONE'
  return Number(fee) > 0 ? 'CUSTOM' : 'FREE'
}

export const statusClass = (status: QuoteRequestStatus) => {
  if (status === 'COMPLETED' || status === 'ACCEPTED') return 'bg-green/10 text-green'
  if (status === 'CONTACTED' || status === 'QUOTED' || status === 'CANCELLED') return 'bg-orange/10 text-orange'
  return 'bg-sage text-green-dark'
}

export const isTerminal = (status: QuoteRequestStatus) => status === 'COMPLETED' || status === 'CANCELLED'

const MONEY_INPUT_PATTERN = /^\d+(\.\d{1,2})?$/
export const isValidUnitPrice = (value: string) => MONEY_INPUT_PATTERN.test(value.trim()) && Number(value) > 0
export const isValidDeliveryFee = (value: string) => MONEY_INPUT_PATTERN.test(value.trim())

export const MAX_UNIT_PRICE = 10_000_000
export const MAX_DELIVERY_FEE = 10_000_000

export const CANCEL_REASONS = [
  'Customer is no longer interested',
  'Items are out of stock',
  'Budget is too high for the customer',
  'Customer found an alternative supplier',
  'Customer could not be reached',
  'Duplicate or accidental request',
] as const
export const OTHER_REASON_KEY = '__OTHER__'