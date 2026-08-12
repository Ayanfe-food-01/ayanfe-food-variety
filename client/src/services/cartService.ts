import { request } from './api'

export interface CustomerCartItem {
  id: string
  productId: string
  name: string
  unit: string
  price: string
  deliveryFee: string
  image: string
  quantity: number
  itemSubtotal: string
  isAvailable: boolean
  availableQuantity: number
  canUpdateQuantity: boolean
  availabilityMessage: string | null
}

export interface CustomerCartSnapshot {
  items: CustomerCartItem[]
  subtotal: string
  deliveryFee: string
  totalQuantity: number
  canCheckout: boolean
}

interface CustomerCartResponse {
  success: true
  data: CustomerCartSnapshot
}

export async function syncCustomerCart(
  items: Array<{ productId: string; quantity: number }>,
): Promise<CustomerCartSnapshot> {
  const response = await request<CustomerCartResponse>('/customer/cart/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  return response.data
}

export async function getCustomerCart(): Promise<CustomerCartSnapshot> {
  const response = await request<CustomerCartResponse>('/cart')
  return response.data
}

export async function addCustomerCartItem(productId: string, quantity: number): Promise<CustomerCartSnapshot> {
  const response = await request<CustomerCartResponse>('/cart/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity }),
  })
  return response.data
}

export async function replaceCustomerCart(
  items: Array<{ productId: string; quantity: number }>,
): Promise<CustomerCartSnapshot> {
  const response = await request<CustomerCartResponse>('/customer/cart', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  return response.data
}

export async function updateCustomerCartItem(cartItemId: string, quantity: number): Promise<CustomerCartSnapshot> {
  const response = await request<CustomerCartResponse>(`/cart/items/${encodeURIComponent(cartItemId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  })
  return response.data
}

export async function removeCustomerCartItem(cartItemId: string): Promise<CustomerCartSnapshot> {
  const response = await request<CustomerCartResponse>(`/cart/items/${encodeURIComponent(cartItemId)}`, {
    method: 'DELETE',
  })
  return response.data
}

export async function clearCustomerCart(): Promise<CustomerCartSnapshot> {
  const response = await request<CustomerCartResponse>('/cart', { method: 'DELETE' })
  return response.data
}