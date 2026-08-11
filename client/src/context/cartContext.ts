import { createContext } from 'react'
import type { Product } from '../types/product'

export interface CartItem {
  id: Product['id']
  cartItemId?: string
  name: Product['name']
  unit: Product['unit']
  price: Product['price']
  image: Product['image']
  quantity: number
  itemSubtotal: number
  isAvailable: boolean
  availableQuantity?: number
  canUpdateQuantity?: boolean
  availabilityMessage: string | null
}

export interface CartContextValue {
  items: CartItem[]
  totalQuantity: number
  subtotal: number
  canCheckout: boolean
  isLoading: boolean
  error: string | null
  pendingItemIds: string[]
  isClearing: boolean
  addToCart: (product: Product, quantity?: number) => Promise<void>
  increaseQuantity: (productId: string) => Promise<void>
  decreaseQuantity: (productId: string) => Promise<void>
  removeFromCart: (productId: string) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
  getItemSubtotal: (item: CartItem) => number
}

export const CartContext = createContext<CartContextValue | undefined>(undefined)