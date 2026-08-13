import type { OrderStatus, PaymentMethod } from '@prisma/client'

export interface CheckoutInput {
  checkoutKey: string
  customerName: string
  phone: string
  deliveryAddress: string
  city: string
  deliveryInstructions?: string
  paymentMethod: PaymentMethod
}

export interface OrderItemResponse {
  id: string
  productId: string
  productName: string
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
  customerName: string
  phone: string
  whatsapp: string | null
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
  transactionReference: string
  amount: string
  transferredAt: string
  proofUrl: string
  status: 'PENDING' | 'VERIFIED' | 'REJECTED'
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
}