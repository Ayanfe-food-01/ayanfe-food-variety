import type { ProductDiscountType } from '@prisma/client'

export interface ProductOption {
  id: string
  label: string
  price: string
  stockQuantity: number
  sortOrder: number
  isActive: boolean
  wholesaleMoq?: number | null
  wholesalePrices?: WholesaleTierInput[]
}

export interface WholesaleTierInput {
  id?: string
  minQuantity: number
  maxQuantity: number | null
  price: string
}

export interface ProductOptionInput {
  id?: string
  label: string
  price: string
  stockQuantity: number
  sortOrder: number
  isActive?: boolean
  wholesaleMoq?: number | null
  wholesalePrices?: WholesaleTierInput[]
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
  archivedOptions?: ProductOption[]
  wholesalePackages?: WholesalePackageInput[]
  isActive: boolean
  isFeatured: boolean
  stockQuantity: number
  availabilityStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  isAvailable: boolean
  isWishlisted: boolean
  wholesaleFrom?: string | null
  averageRating?: number | null
  reviewCount?: number
  createdAt: string
  updatedAt: string
}

export type PublicProduct = Product

export type PublicProductSort = 'relevance' | 'price_asc' | 'price_desc' | 'newest'
export type AdminProductSort = 'newest' | 'oldest' | 'updated' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc'

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
  categoryIds?: string[]
  availability?: 'active' | 'inactive' | 'out-of-stock'
  stockStatus?: 'in-stock' | 'low-stock' | 'out-of-stock'
  featured?: boolean
  discount?: 'on-sale' | 'no-discount'
  productType?: 'simple' | 'with-options'
  wholesale?: 'enabled' | 'not-configured'
  minPrice?: number
  maxPrice?: number
  sort?: AdminProductSort
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

export interface WholesalePricingTier {
  minQuantity: number
  maxQuantity: number | null
  price: string
}

export interface WholesalePackagePricing {
  packageId: string
  productId: string
  productOptionId: string | null
  name: string
  unitsPerPackage: number
  price: string
  isActive: boolean
}

// Admin shape of a wholesale package (carton/case). A package belongs to a
// specific unit/size (ProductOption) when productOptionId is provided; a null
// productOptionId means the product's single unit.
export interface WholesalePackageInput {
  id?: string
  productOptionId?: string | null
  name: string
  unitsPerPackage: number
  price: string
  isActive?: boolean
  sortOrder?: number
}

export interface ProductWholesalePricing {
  productId: string
  packages: WholesalePackagePricing[]
}

export interface WholesaleOptionPricing {
  optionId: string
  label: string
  moq: number | null
  tiers: WholesalePricingTier[]
}