import { request } from './api'

export type OrderType = 'RETAIL' | 'WHOLESALE'

export interface CreatedOrder {
  id: string
  orderNumber: string
  quoteNumber: string | null
  customerName: string
  phone: string
  whatsapp: string | null
  fulfillmentMethod: FulfillmentMethod
  orderType: OrderType
  email: string | null
  deliveryAddress: string
  city: string
  note: string | null
  subtotal: string
  deliveryFee: string
  deliveryZoneName: string | null
  deliveryZoneId: string | null
  total: string
  paymentMethod: PaymentMethod
  orderItems: Array<{
    id: string
    productId: string
    productName: string
    productOptionId: string | null
    productOptionLabel: string | null
    unitPrice: string
    quantity: number
    subtotal: string
     deliveryFee: string
    product: { id: string; slug: string; image: string }
  }>
  paymentStatus: CustomerPaymentStatus
  paymentConfirmedAt: string | null
  orderStatus: OrderStatus
  cancellationReason: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
  paymentSubmissions: Array<{
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

export interface GuestOrder {
  orderNumber: string
  fulfillmentMethod: FulfillmentMethod
  orderType: OrderType
  deliveryAddress: string
  city: string
  subtotal: string
  deliveryFee: string
  deliveryZoneName: string | null
  total: string
  paymentStatus: CustomerPaymentStatus
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

export interface CustomerOrderListItem {
  id: string
  orderNumber: string
  customerName: string
  fulfillmentMethod: FulfillmentMethod
  orderType: OrderType
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

interface GuestOrderResponse {
  success: true
  data: { order: GuestOrder }
}

export async function checkoutCustomerCart(input: {
  checkoutKey: string
  guestAccessToken?: string
  cartItems?: Array<{ productId: string; productOptionId?: string | null; quantity: number }>
  customerName: string
  phone: string
  email: string
  fulfillmentMethod: FulfillmentMethod
  deliveryAddress?: string
  city?: string
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

export async function getGuestOrder(orderNumber: string, accessToken: string): Promise<CreatedOrder> {
  const response = await request<CustomerOrderResponse>(`/orders/guest/${encodeURIComponent(orderNumber)}`, {
    headers: { 'X-Guest-Access-Token': accessToken },
  })
  return response.data.order
}

export async function trackGuestOrder(orderNumber: string, contact: string): Promise<GuestOrder> {
  const response = await request<GuestOrderResponse>('/orders/guest/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber, contact }),
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

export async function cancelCustomerOrder(orderNumber: string, reason?: string): Promise<CreatedOrder> {
  const response = await request<CustomerOrderResponse>(`/orders/${encodeURIComponent(orderNumber)}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  return response.data.order
}

export type OrderStatus = 'ORDER_PLACED' | 'PROCESSING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED'
export type CustomerPaymentStatus = 'PENDING' | 'PAID' | 'REJECTED'
export type PaymentMethod = 'BANK_TRANSFER' | 'PAYSTACK'
export type FulfillmentMethod = 'PICKUP' | 'DELIVERY'

export interface AdminOrder {
  orderNumber: string
  id: string
  quoteNumber: string | null
  customerName: string
  phone: string
  whatsapp: string | null
  fulfillmentMethod: FulfillmentMethod
  shoppingMode: OrderType
  email: string | null
  deliveryAddress: string
  city: string
  note: string | null
  subtotal: string
  deliveryFee: string
  deliveryZoneName: string | null
  deliveryZoneId: string | null
  total: string
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  archivedAt: string | null
  cancellationReason: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
  orderItems: Array<{
    id: string
    productId: string
    productName: string
    productOptionId: string | null
    productOptionLabel: string | null
    unitPrice: string
    quantity: number
    subtotal: string
     deliveryFee: string
  }>
  paymentSubmissions: Array<{
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
    changedBy: { name: string; email: string } | null
    note: string | null
    createdAt: string
  }>
}

export interface AdminOrderListItem {
  orderNumber: string
  customerName: string
  email: string | null
  phone: string
  fulfillmentMethod: FulfillmentMethod
  shoppingMode: OrderType
  total: string
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  archivedAt: string | null
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
  archive?: 'active' | 'archived' | 'all'
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

export async function archiveAdminOrder(orderNumber: string): Promise<AdminOrder> {
  const response = await request<AdminOrderResponse>(`/admin/orders/${encodeURIComponent(orderNumber)}/archive`, {
    method: 'PATCH',
  })
  return response.data.order
}

export async function restoreAdminOrder(orderNumber: string): Promise<AdminOrder> {
  const response = await request<AdminOrderResponse>(`/admin/orders/${encodeURIComponent(orderNumber)}/restore`, {
    method: 'PATCH',
  })
  return response.data.order
}

export async function deleteAdminOrder(orderNumber: string): Promise<void> {
  await request<{ success: true }>(`/admin/orders/${encodeURIComponent(orderNumber)}`, { method: 'DELETE' })
}

export interface DeliveryLocationState {
  id: string
  name: string
  cities: Array<{ id: string; name: string }>
}

interface DeliveryLocationStatesResponse {
  success: true
  data: { states: DeliveryLocationState[] }
}

export async function getDeliveryLocationStates(): Promise<DeliveryLocationState[]> {
  const response = await request<DeliveryLocationStatesResponse>('/delivery-zones/delivery-locations/states')
  return response.data.states
}

// A delivery zone resolved for a city for display only. The server recomputes
// the fee and order total authoritatively at checkout; the client never trusts
// these values for the final total.
export interface ResolvedDeliveryZone {
  id: string
  label: string
  fee: string
  freeDeliveryThreshold: string | null
  minDeliveryDays: number | null
  maxDeliveryDays: number | null
}

interface ResolveDeliveryZoneResponse {
  success: true
  data: { zone: ResolvedDeliveryZone | null }
}

export async function resolveDeliveryZone(city: string): Promise<ResolvedDeliveryZone | null> {
  const params = new URLSearchParams({ city })
  const response = await request<ResolveDeliveryZoneResponse>(`/delivery-zones/resolve?${params.toString()}`)
  return response.data.zone
}