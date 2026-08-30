import type { FulfillmentMethod, OrderStatus, PaymentMethod, ShoppingMode } from '@prisma/client'

export interface CheckoutInput {
  checkoutKey: string
  guestAccessToken?: string
  cartItems?: Array<{
    productId: string
    productOptionId?: string | null
    quantity: number
  }>
  customerName: string
  phone: string
  email: string
  fulfillmentMethod: FulfillmentMethod
  deliveryAddress?: string
  city?: string
  deliveryInstructions?: string
  paymentMethod: PaymentMethod
}

export interface GuestOrderTrackingInput {
  orderNumber: string
  contact: string
}

export interface CancellationInput {
  reason?: string
}

/**
 * Delivery details a customer supplies when an accepted quotation is converted
 * into an order. Money and order content never come from here — they are taken
 * from the quotation snapshot. All fields are optional because pickup orders
 * need no address; the service requires delivery fields only when the
 * quotation is fulfilled by delivery.
 */
export interface ConvertQuoteToOrderInput {
  whatsapp?: string
  deliveryAddress?: string
  city?: string
  deliveryInstructions?: string
}

export interface OrderItemResponse {
  id: string
  productId: string
  productName: string
  productOptionId: string | null
  productOptionLabel: string | null
  unitPrice: string
  quantity: number
  subtotal: string
  deliveryFee: string
  product: {
    id: string
    slug: string
    image: string
  }
}

export interface OrderResponse {
  id: string
  orderNumber: string
  quoteNumber: string | null
  customerName: string
  phone: string
  whatsapp: string | null
  fulfillmentMethod: FulfillmentMethod
  orderType: ShoppingMode
  email: string | null
  deliveryAddress: string
  city: string
  note: string | null
  subtotal: string
  deliveryFee: string
  total: string
  paymentMethod: PaymentMethod
  paymentStatus: 'PENDING' | 'PAID' | 'REJECTED'
  orderStatus: OrderStatus
  cancellationReason: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
  orderItems: OrderItemResponse[]
  paymentSubmissions: CustomerPaymentSubmissionResponse[]
  payment: OrderPaymentResponse | null
  statusHistory: Array<{
    previousStatus: OrderStatus | null
    newStatus: OrderStatus
    createdAt: string
  }>
}

export interface GuestOrderResponse {
  orderNumber: string
  fulfillmentMethod: FulfillmentMethod
  orderType: ShoppingMode
  deliveryAddress: string
  city: string
  subtotal: string
  deliveryFee: string
  total: string
  paymentStatus: 'PENDING' | 'PAID' | 'REJECTED'
  paymentConfirmedAt: string | null
  orderStatus: OrderStatus
  createdAt: string
  orderItems: Array<{
    id: string
    productName: string
    productOptionLabel: string | null
    unitPrice: string
    quantity: number
    subtotal: string
    deliveryFee: string
    image: string
  }>
  statusHistory: Array<{
    previousStatus: OrderStatus | null
    newStatus: OrderStatus
    createdAt: string
  }>
}

export interface OrderPaymentResponse {
  paymentMethod: PaymentMethod
  bankName: string
  accountName: string
  accountNumber: string
  instructions: string
}

export interface CustomerPaymentSubmissionResponse {
  id: string
  senderName: string
  transactionReference: string | null
  amount: string
  transferredAt: string
  proofUrl: string
  status: 'PENDING' | 'VERIFIED' | 'REJECTED'
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
}