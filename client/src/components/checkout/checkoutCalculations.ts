import type { FulfillmentMethod } from '../../services/orderService'

export function calculateCheckoutTotals(
  subtotal: number,
  cartDeliveryFee: number,
  fulfillmentMethod: FulfillmentMethod | '',
) {
  const deliveryFee = fulfillmentMethod === 'DELIVERY' ? cartDeliveryFee : 0

  return {
    deliveryFee,
    total: subtotal + deliveryFee,
  }
}