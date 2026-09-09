import { createContext } from 'react'
import type { Product, ProductOption, WholesalePackage } from '../types/product'
import type { ProductDiscountType } from '../types/product'
import type { ShoppingMode } from '../services/authService'

export const cartItemLineKey = (
  id: string,
  productOptionId: string | null,
  wholesalePackageId: string | null = null,
) => `${id}|${productOptionId ?? ''}|${wholesalePackageId ?? ''}`

export interface CartItem {
  id: Product['id']
  cartItemId?: string
  productOptionId: string | null
  productOptionLabel: string | null
  wholesalePackageId: string | null
  wholesalePackageName: string | null
  wholesaleUnitsPerPackage: number | null
  name: Product['name']
  unit: Product['unit']
  price: Product['price']
  originalPrice: number
  discountType: ProductDiscountType | null
  discountValue: number | null
  deliveryFee: Product['deliveryFee']
  image: Product['image']
  quantity: number
  minQuantity: number
  itemSubtotal: number
  isAvailable: boolean
  availableQuantity?: number
  canUpdateQuantity?: boolean
  availabilityMessage: string | null
}

export interface CartContextValue {
  items: CartItem[]
  mode: ShoppingMode
  totalQuantity: number
  subtotal: number
  canCheckout: boolean
  isLoading: boolean
  error: string | null
  pendingItemIds: string[]
  isClearing: boolean
  addToCart: (
    product: Product,
    quantity?: number,
    selectedOption?: ProductOption | null,
    wholesalePackage?: WholesalePackage | null,
  ) => Promise<void>
  increaseQuantity: (item: CartItem) => Promise<void>
  decreaseQuantity: (item: CartItem) => Promise<void>
  removeFromCart: (item: CartItem) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
  getItemSubtotal: (item: CartItem) => number
}

export const CartContext = createContext<CartContextValue | undefined>(undefined)