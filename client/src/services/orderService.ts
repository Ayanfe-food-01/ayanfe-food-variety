import { request } from './api'

export interface CreatedOrder {
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
  orderItems: Array<{
    id: string
    productId: string
    productName: string
    unitPrice: string
    quantity: number
    subtotal: string
     deliveryFee: string
    product: { id: string; slug: string; image: string }
  }>
  paymentStatus: CustomerPaymentStatus
  orderStatus: OrderStatus
  createdAt: string
  updatedAt: string
  paymentSubmissions: Array<{
    id: string
    senderName: string
    transactionReference: string
    amount: string
    transferredAt: string
    status: 'PENDING' | 'VERIFIED' | 'REJECTED'
    reviewedAt: string | null
    createdAt: string
  }>
  payment: {
    paymentMethod: PaymentMethod
    bankName: string
    accountName: string
    accountNumber: string
    instructions: string
  } | null
  statusHistory: Array<{
    previousStatus: OrderStatus | null
    newStatus: OrderStatus
    createdAt: string
  }>
}

export interface CustomerOrderListItem {
  id: string
  orderNumber: string
  customerName: string
  total: string
  paymentStatus: CustomerPaymentStatus
  orderStatus: OrderStatus
  createdAt: string
}

interface CustomerOrdersResponse {
  success: true
  data: { orders: CustomerOrderListItem[] }
}

interface CustomerOrderResponse {
  success: true
  data: { order: CreatedOrder }
}

export async function checkoutCustomerCart(input: {
  checkoutKey: string
  customerName: string
  phone: string
  deliveryAddress: string
  city: string
  deliveryInstructions?: string
  paymentMethod: PaymentMethod
}): Promise<CreatedOrder> {
  const response = await request<CustomerOrderResponse>('/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Checkout-Request': '1',
    },
    body: JSON.stringify(input),
  })
  return response.data.order
}

export async function getCustomerOrders(): Promise<CustomerOrderListItem[]> {
  const response = await request<CustomerOrdersResponse>('/orders')
  return response.data.orders
}

export async function getCustomerOrder(orderNumber: string): Promise<CreatedOrder> {
  const response = await request<CustomerOrderResponse>(`/orders/${encodeURIComponent(orderNumber)}`)
  return response.data.order
}

export type OrderStatus = 'ORDER_PLACED' | 'PROCESSING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED'
export type CustomerPaymentStatus = 'PENDING' | 'PAID' | 'REJECTED'
export type PaymentMethod = 'BANK_TRANSFER'

export interface AdminOrder {
  orderNumber: string
  id: string
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
     deliveryFee: string
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
  paymentSnapshot: {
    paymentMethod: PaymentMethod
    bankName: string
    accountName: string
    accountNumber: string
    instructions: string
  } | null
  statusHistory: Array<{
    id: string
    previousStatus: OrderStatus | null
    newStatus: OrderStatus
    changedBy: { name: string; email: string }
    note: string | null
    createdAt: string
  }>
}

export interface AdminOrderListItem {
  orderNumber: string
  customerName: string
  email: string | null
  phone: string
  total: string
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  createdAt: string
}

interface AdminOrdersResponse {
  success: true
  data: {
    orders: AdminOrderListItem[]
    pagination: { page: number; pageSize: number; total: number; totalPages: number }
  }
}

interface AdminOrderResponse {
  success: true
  message?: string
  data: { order: AdminOrder }
}

export interface AdminOrdersQuery {
  search?: string
  paymentStatus?: PaymentStatus
  orderStatus?: OrderStatus
  sort?: 'newest' | 'oldest'
  page?: number
  pageSize?: number
}

export interface AdminOrdersPage {
  orders: AdminOrderListItem[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

export async function getAdminOrders(query: AdminOrdersQuery = {}): Promise<AdminOrdersPage> {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const response = await request<AdminOrdersResponse>(`/admin/orders${params.size ? `?${params.toString()}` : ''}`)
  return response.data
}

export async function getAdminOrder(orderNumber: string): Promise<AdminOrder> {
  const response = await request<AdminOrderResponse>(`/admin/orders/${encodeURIComponent(orderNumber)}`)
  return response.data.order
}

export async function updateAdminOrderStatus(orderNumber: string, orderStatus: OrderStatus, note?: string): Promise<AdminOrder> {
  const response = await request<AdminOrderResponse>(`/admin/orders/${encodeURIComponent(orderNumber)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderStatus, note }),
  })
  return response.data.order
}