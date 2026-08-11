import { request } from './api'

export interface CreateOrderItemInput {
  productId: string
  quantity: number
}

export interface CreateOrderInput {
  customerName: string
  phone: string
  whatsapp?: string
  email?: string
  deliveryAddress: string
  city: string
  note?: string
  items: CreateOrderItemInput[]
}

export interface CreatedOrder {
  id: string
  customerName: string
  phone: string
  whatsapp: string | null
  email: string | null
  deliveryAddress: string
  city: string
  note: string | null
  subtotal: string
  total: string
  paymentStatus: string
  orderStatus: string
  createdAt: string
  updatedAt: string
}

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED'

export interface AdminOrder {
  id: string
  customerName: string
  phone: string
  whatsapp: string | null
  email: string | null
  deliveryAddress: string
  city: string
  note: string | null
  subtotal: string
  total: string
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  createdAt: string
  updatedAt: string
  orderItems: Array<{
    id: string
    productId: string
    productName: string
    unitPrice: string
    quantity: number
    subtotal: string
  }>
  paymentSubmissions: Array<{
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
  }>
}

export interface AdminOrderListItem {
  id: string
  customerName: string
  email: string | null
  phone: string
  total: string
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  createdAt: string
}

interface CreateOrderResponse {
  success: true
  message: string
  data: {
    order: CreatedOrder
  }
}

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const response = await request<CreateOrderResponse>('/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return response.data.order
}

interface AdminOrdersResponse {
  success: true
  data: { orders: AdminOrderListItem[] }
}

interface AdminOrderResponse {
  success: true
  message?: string
  data: { order: AdminOrder }
}

export async function getAdminOrders(): Promise<AdminOrderListItem[]> {
  const response = await request<AdminOrdersResponse>('/admin/orders')
  return response.data.orders
}

export async function getAdminOrder(id: string): Promise<AdminOrder> {
  const response = await request<AdminOrderResponse>(`/admin/orders/${id}`)
  return response.data.order
}

export async function updateAdminOrderStatus(id: string, orderStatus: OrderStatus): Promise<AdminOrder> {
  const response = await request<AdminOrderResponse>(`/admin/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderStatus }),
  })
  return response.data.order
}