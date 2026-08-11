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
}

export interface CartContextValue {
  items: CartItem[]
  totalQuantity: number
  subtotal: number
  addToCart: (product: Product, quantity?: number) => Promise<void>
  increaseQuantity: (productId: string) => void
  decreaseQuantity: (productId: string) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  getItemSubtotal: (item: CartItem) => number
}

export const CartContext = createContext<CartContextValue | undefined>(undefined)