import type { FulfillmentMethod, PaymentMethod } from '../../services/orderService'

export interface CheckoutFormData {
  fullName: string
  phone: string
  email: string
  fulfillmentMethod: FulfillmentMethod | ''
  address: string
  city: string
  deliveryInstructions: string
  paymentMethod: PaymentMethod
}

export type CheckoutField = keyof CheckoutFormData
export type CheckoutFormErrors = Partial<Record<CheckoutField, string>>