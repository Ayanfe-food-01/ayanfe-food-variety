import type { FulfillmentMethod } from '../../services/orderService'

export function calculateCheckoutTotals(
  subtotal: number,
  fulfillmentMethod: FulfillmentMethod | '',
  deliveryZoneFee?: number | null,
) {
  const deliveryFee = fulfillmentMethod === 'DELIVERY'
    ? (deliveryZoneFee ?? null)
    : 0

  return {
    deliveryFee,
    total: subtotal + (deliveryFee ?? 0),
  }
}