import type { ProductDiscountType, ShoppingMode } from '@prisma/client'

export interface CartItemInput {
  productId: string
  productOptionId: string | null
  wholesalePackageId: string | null
  quantity: number
}

export interface CustomerCartItemResponse {
  id: string
  productId: string
  productOptionId: string | null
  productOptionLabel: string | null
  wholesalePackageId: string | null
  wholesalePackageName: string | null
  wholesaleUnitsPerPackage: number | null
  name: string
  unit: string
  price: string
  originalPrice: string
  discountType: ProductDiscountType | null
  discountValue: string | null
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
  totalQuantity: number
  canCheckout: boolean
}