import type { FulfillmentMethod } from '../../services/orderService'
import type { ResolvedDeliveryZone } from '../../services/orderService'

// Display-only delivery fee for a resolved zone, applying the free-delivery
// threshold against the cart subtotal. Returns null when no zone is resolved.
// The server recomputes the authoritative fee/total at checkout.
export function deliveryFeeFromZone(
  zone: ResolvedDeliveryZone | null,
  subtotal: number,
): number | null {
  if (!zone) return null
  if (zone.freeDeliveryThreshold !== null && subtotal >= Number(zone.freeDeliveryThreshold)) {
    return 0
  }
  return Number(zone.fee)
}

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