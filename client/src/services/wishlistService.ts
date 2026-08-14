import { request } from './api'
import type { Product } from '../types/product'

interface WishlistResponse {
  data: {
    products: Product[]
    productIds: string[]
  }
}

interface WishlistStatusResponse {
  data: { isWishlisted: boolean }
}

export async function getWishlist(): Promise<WishlistResponse['data']> {
  const response = await request<WishlistResponse>('/wishlist')
  return response.data
}

export async function addToWishlist(productId: string): Promise<boolean> {
  const response = await request<WishlistStatusResponse>(`/wishlist/${encodeURIComponent(productId)}`, { method: 'POST' })
  return response.data.isWishlisted
}

export async function removeFromWishlist(productId: string): Promise<boolean> {
  const response = await request<WishlistStatusResponse>(`/wishlist/${encodeURIComponent(productId)}`, { method: 'DELETE' })
  return response.data.isWishlisted
}