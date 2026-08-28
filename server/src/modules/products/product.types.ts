import type { ProductDiscountType } from '@prisma/client'

export interface ProductOption {
  id: string
  label: string
  price: string
  stockQuantity: number
  sortOrder: number
  isActive: boolean
}

export interface ProductOptionInput {
  label: string
  price: string
  stockQuantity: number
  sortOrder: number
  isActive?: boolean
}

export interface Product {
  id: string
  categoryId: string
  categoryName: string
  categorySlug: string
  name: string
  slug: string
  description: string
  price: string
  discountType: ProductDiscountType | null
  discountValue: string | null
  discountedPrice: string
  deliveryFee: string
  unit: string
  image: string
  images: string[]
  options: ProductOption[]
  isActive: boolean
  isFeatured: boolean
  stockQuantity: number
  availabilityStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  isAvailable: boolean
  isWishlisted: boolean
  createdAt: string
  updatedAt: string
}

export type PublicProduct = Product

export type PublicProductSort = 'relevance' | 'price_asc' | 'price_desc' | 'newest'

export interface PublicProductQuery {
  search?: string
  category?: string
  sort: PublicProductSort
  page: number
  limit: number
}

export interface PublicProductPage {
  products: PublicProduct[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface PublicCategoryProductSection {
  category: {
    id: string
    name: string
    slug: string
  }
  products: PublicProduct[]
}

export interface AdminProductQuery {
  search?: string
  categoryId?: string
  availability?: 'active' | 'inactive' | 'out-of-stock'
  page: number
  pageSize: number
}

export interface ProductInput {
  name: string
  categoryId: string
  price?: string
  discountType: ProductDiscountType | null
  discountValue: string | null
  deliveryFee: string
  unit: string
  description: string
  isActive: boolean
  isFeatured: boolean
  stockQuantity?: number
  image?: string
  images?: string[]
  options?: ProductOptionInput[]
}