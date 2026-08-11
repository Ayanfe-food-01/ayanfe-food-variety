export interface CreateOrderItemInput {
  productId: string
  quantity: number
}

export interface CreateOrderInput {
  userId?: string
  customerName: string
  phone: string
  whatsapp?: string
  email?: string
  deliveryAddress: string
  city: string
  note?: string
  items: CreateOrderItemInput[]
}

export interface CheckoutInput {
  customerName: string
  phone: string
  deliveryAddress: string
  city: string
  note?: string
}

export interface OrderItemResponse {
  id: string
  productId: string
  productName: string
  unitPrice: string
  quantity: number
  subtotal: string
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
  paymentStatus: 'PENDING' | 'PAID' | 'REJECTED'
  orderStatus: string
  createdAt: string
  updatedAt: string
  orderItems: OrderItemResponse[]
  paymentSubmissions: CustomerPaymentSubmissionResponse[]
}

export interface CustomerPaymentSubmissionResponse {
  id: string
  senderName: string
  transactionReference: string
  amount: string
  transferredAt: string
  status: 'PENDING' | 'VERIFIED' | 'REJECTED'
  reviewedAt: string | null
  createdAt: string
}