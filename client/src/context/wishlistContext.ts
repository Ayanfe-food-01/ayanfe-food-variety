import { createContext } from 'react'
import type { Product } from '../types/product'

export interface WishlistContextValue {
  products: Product[]
  count: number
  isLoading: boolean
  isWishlisted: (productId: string, fallback?: boolean) => boolean
  pendingProductIds: string[]
  toggleWishlist: (product: Product) => Promise<boolean>
  refreshWishlist: () => Promise<void>
}

export const WishlistContext = createContext<WishlistContextValue | null>(null)