export type ProductDiscountType = 'PERCENTAGE' | 'FIXED'

export interface Product {
  id: string
  name: string
  slug?: string
  category: string
  unit: string
  price: number
  discountedPrice: number
  discountType: ProductDiscountType | null
  discountValue: number | null
  deliveryFee: number
  image: string
  description: string
  categoryId?: string
  categorySlug?: string
  stockQuantity: number
  isActive: boolean
  isFeatured: boolean
  isAvailable: boolean
  isWishlisted: boolean
  availabilityStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  createdAt?: string
  updatedAt?: string
}