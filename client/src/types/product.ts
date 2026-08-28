export type ProductDiscountType = 'PERCENTAGE' | 'FIXED'

export interface ProductOption {
  id: string
  label: string
  price: number
  stockQuantity: number
  sortOrder: number
  isActive: boolean
}

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
  images: string[]
  description: string
  categoryId?: string
  categorySlug?: string
  stockQuantity: number
  isActive: boolean
  isFeatured: boolean
  isAvailable: boolean
  isWishlisted: boolean
  availabilityStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  options?: ProductOption[]
  createdAt?: string
  updatedAt?: string
}