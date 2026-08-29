import type { ProductDiscountType, ShoppingMode } from '@prisma/client'

export interface CartItemInput {
  productId: string
  productOptionId: string | null
  quantity: number
}

export interface CustomerCartItemResponse {
  id: string
  productId: string
  productOptionId: string | null
  productOptionLabel: string | null
  name: string
  unit: string
  price: string
  originalPrice: string
  discountType: ProductDiscountType | null
  discountValue: string | null
  deliveryFee: string
  image: string
  quantity: number
  minQuantity: number
  itemSubtotal: string
  isAvailable: boolean
  availableQuantity: number
  canUpdateQuantity: boolean
  availabilityMessage: string | null
}

export interface CustomerCartResponse {
  mode: ShoppingMode
  items: CustomerCartItemResponse[]
  subtotal: string
  deliveryFee: string
  totalQuantity: number
  canCheckout: boolean
}