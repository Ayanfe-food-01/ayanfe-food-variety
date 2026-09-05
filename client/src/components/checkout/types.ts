import type { FulfillmentMethod, PaymentMethod } from '../../services/orderService'

export type CheckoutStep = 'contact' | 'delivery' | 'payment' | 'review'

export interface CheckoutFormData {
  fullName: string
  phone: string
  email: string
  fulfillmentMethod: FulfillmentMethod | ''
  state: string
  // cityId/areaId are captured for the authoritative server resolution; city
  // and area are the display names (and legacy fallback for older clients).
  cityId: string
  city: string
  areaId: string
  area: string
  address: string
  deliveryInstructions: string
  paymentMethod: PaymentMethod
}

export type CheckoutField = keyof CheckoutFormData
export type CheckoutFormErrors = Partial<Record<CheckoutField, string>>