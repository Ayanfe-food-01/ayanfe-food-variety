export type ProductDiscountType = 'PERCENTAGE' | 'FIXED'

export interface WholesalePriceTier {
  id: string
  minQuantity: number
  maxQuantity: number | null
  price: number
}

export interface ProductOption {
  id: string
  label: string
  price: number
  stockQuantity: number
  lowStockThreshold?: number | null
  sortOrder: number
  isActive: boolean
  wholesaleMoq?: number | null
  wholesalePrices?: WholesalePriceTier[]
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
  lowStockThreshold?: number
  isActive: boolean
  isFeatured: boolean
  isAvailable: boolean
  isWishlisted: boolean
  availabilityStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  options?: ProductOption[]
  archivedOptions?: ProductOption[]
  wholesaleFrom?: number | null
  averageRating?: number | null
  reviewCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface WholesalePricingTier {
  minQuantity: number
  maxQuantity: number | null
  price: number
}

// A wholesale package (carton/case) customers buy as a whole. productOptionId
// is the unit/size (ProductOption) the package belongs to (null = the product's
// single unit).
export interface WholesalePackage {
  packageId: string
  productOptionId: string | null
  name: string
  unitsPerPackage: number
  price: number
  isActive: boolean
}

export interface ProductWholesalePricing {
  productId: string
  packages: WholesalePackage[]
}