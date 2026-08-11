import { request } from './api'

export interface CustomerCartItem {
  id: string
  productId: string
  name: string
  unit: string
  price: string
  image: string
  quantity: number
}

interface CustomerCartResponse {
  success: true
  data: { items: CustomerCartItem[] }
}

export async function syncCustomerCart(
  items: Array<{ productId: string; quantity: number }>,
): Promise<CustomerCartItem[]> {
  const response = await request<CustomerCartResponse>('/customer/cart/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  return response.data.items
}

export async function getCustomerCart(): Promise<CustomerCartItem[]> {
  const response = await request<CustomerCartResponse>('/cart')
  return response.data.items
}

export async function addCustomerCartItem(productId: string, quantity: number): Promise<CustomerCartItem[]> {
  const response = await request<CustomerCartResponse>('/cart/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity }),
  })
  return response.data.items
}

export async function replaceCustomerCart(
  items: Array<{ productId: string; quantity: number }>,
): Promise<CustomerCartItem[]> {
  const response = await request<CustomerCartResponse>('/customer/cart', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  return response.data.items
}