import { request } from './api'
import type {
  Product,
  ProductWholesalePricing,
  WholesalePriceResult,
} from '../types/product'

interface ProductApiResponse {
  id: string
  categoryId: string
  categoryName: string
  categorySlug: string
  name: string
  slug: string
  description: string
  price: string
  discountedPrice: string
  discountType: 'PERCENTAGE' | 'FIXED' | null
  discountValue: string | null
  deliveryFee: string
  unit: string
  image: string
  images?: string[]
  stockQuantity: number
  isActive: boolean
  isFeatured: boolean
  isAvailable: boolean
  isWishlisted: boolean
  availabilityStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  averageRating?: number | null
  reviewCount?: number
  createdAt: string
  updatedAt: string
  options?: ProductOptionApiResponse[]
  wholesaleFrom?: string | null
}

interface ProductListResponse {
  data: {
    products: ProductApiResponse[]
    pagination: ProductPage['pagination']
  }
}

interface ProductResponse {
  data: ProductApiResponse
}

interface ProductOptionApiResponse {
  id: string
  label: string
  price: string
  stockQuantity: number
  sortOrder: number
  isActive: boolean
}

export interface ProductQuery {
  search?: string
  category?: string
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest'
  page?: number
  limit?: number
  signal?: AbortSignal
}

export interface ProductPage {
  products: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CategoryProductSection {
  category: {
    id: string
    name: string
    slug: string
  }
  products: Product[]
}

interface CategoryProductSectionsResponse {
  data: {
    sections: Array<{
      category: CategoryProductSection['category']
      products: ProductApiResponse[]
    }>
  }
}

const toProduct = (product: ProductApiResponse): Product => {
  const price = Number(product.price)
  const discountedPrice = Number(product.discountedPrice)
  const discountValue = product.discountValue === null ? null : Number(product.discountValue)
  const deliveryFee = Number(product.deliveryFee)
  const stockQuantity = Number(product.stockQuantity)
  const wholesaleFrom = product.wholesaleFrom === undefined || product.wholesaleFrom === null
    ? null
    : Number(product.wholesaleFrom)

  if (
    !Number.isFinite(price)
    || !Number.isFinite(discountedPrice)
    || discountedPrice < 0
    || discountedPrice > price
    || (discountValue !== null && (!Number.isFinite(discountValue) || discountValue <= 0))
    || !Number.isFinite(deliveryFee)
    || deliveryFee < 0
    || !Number.isInteger(stockQuantity)
    || stockQuantity < 0
    || (wholesaleFrom !== null && (!Number.isFinite(wholesaleFrom) || wholesaleFrom <= 0))
    || (product.averageRating !== undefined && product.averageRating !== null && (!Number.isFinite(product.averageRating) || product.averageRating < 0 || product.averageRating > 5))
    || (product.reviewCount !== undefined && (!Number.isInteger(product.reviewCount) || product.reviewCount < 0))
  ) {
    throw new Error('The product data is invalid.')
  }

  const options: Product['options'] = product.options !== undefined
    ? product.options.map((option) => {
      const optionPrice = Number(option.price)

      if (
        !Number.isFinite(optionPrice)
        || optionPrice <= 0
        || !Number.isInteger(option.stockQuantity)
        || option.stockQuantity < 0
        || !Number.isInteger(option.sortOrder)
        || option.sortOrder < 0
      ) {
        throw new Error('The product data is invalid.')
      }

      return {
        id: option.id,
        label: option.label,
        price: optionPrice,
        stockQuantity: option.stockQuantity,
        sortOrder: option.sortOrder,
        isActive: option.isActive,
      }
    })
    : undefined

  return {
    id: product.id,
    categoryId: product.categoryId,
    categorySlug: product.categorySlug,
    name: product.name,
    slug: product.slug,
    category: product.categoryName,
    unit: product.unit,
    price,
    discountedPrice,
    discountType: product.discountType,
    discountValue,
    deliveryFee,
    image: product.image,
    images: product.images?.filter(Boolean).length
      ? product.images.filter(Boolean)
      : product.image
        ? [product.image]
        : [],
    description: product.description,
    stockQuantity,
    availabilityStatus: product.availabilityStatus,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    isAvailable: product.isAvailable,
    isWishlisted: product.isWishlisted,
    options,
    wholesaleFrom,
    averageRating: product.averageRating === undefined ? undefined : product.averageRating,
    reviewCount: product.reviewCount === undefined ? undefined : product.reviewCount,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}

export async function getProducts(query: ProductQuery = {}): Promise<ProductPage> {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.category) params.set('category', query.category)
  if (query.sort && query.sort !== 'relevance') params.set('sort', query.sort)
  if (query.page && query.page > 1) params.set('page', String(query.page))
  if (query.limit && query.limit !== 20) params.set('limit', String(query.limit))
  const queryString = params.toString()
  const response = await request<ProductListResponse>(`/products${queryString ? `?${queryString}` : ''}`, {
    signal: query.signal,
  })
  return {
    products: response.data.products.map(toProduct),
    pagination: response.data.pagination,
  }
}

export async function getCategoryProductSections(limit = 6): Promise<CategoryProductSection[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  const response = await request<CategoryProductSectionsResponse>(`/products/category-sections?${params.toString()}`)
  return response.data.sections.map((section) => ({
    category: section.category,
    products: section.products.map(toProduct),
  }))
}

export async function getNewArrivals(query: Omit<ProductQuery, 'sort'> = {}): Promise<ProductPage> {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.category) params.set('category', query.category)
  if (query.page && query.page > 1) params.set('page', String(query.page))
  if (query.limit && query.limit !== 20) params.set('limit', String(query.limit))
  const queryString = params.toString()
  const response = await request<ProductListResponse>(`/products/new-arrivals${queryString ? `?${queryString}` : ''}`, {
    signal: query.signal,
  })
  return {
    products: response.data.products.map(toProduct),
    pagination: response.data.pagination,
  }
}

export async function getPopularProducts(query: Omit<ProductQuery, 'sort'> = {}): Promise<ProductPage> {
  const params = new URLSearchParams()
  if (query.page && query.page > 1) params.set('page', String(query.page))
  if (query.limit && query.limit !== 20) params.set('limit', String(query.limit))
  const queryString = params.toString()
  const response = await request<ProductListResponse>(`/products/popular${queryString ? `?${queryString}` : ''}`, {
    signal: query.signal,
  })
  return {
    products: response.data.products.map(toProduct),
    pagination: response.data.pagination,
  }
}

export async function getFeaturedProducts(query: Omit<ProductQuery, 'sort'> = {}): Promise<ProductPage> {
  const params = new URLSearchParams()
  if (query.page && query.page > 1) params.set('page', String(query.page))
  if (query.limit && query.limit !== 20) params.set('limit', String(query.limit))
  const queryString = params.toString()
  const response = await request<ProductListResponse>(`/products/featured${queryString ? `?${queryString}` : ''}`, {
    signal: query.signal,
  })
  return {
    products: response.data.products.map(toProduct),
    pagination: response.data.pagination,
  }
}

export async function getProduct(id: string): Promise<Product> {
  const response = await request<ProductResponse>(`/products/${encodeURIComponent(id)}`)
  return toProduct(response.data)
}

interface ProductWholesalePricingResponse {
  data: {
    productId: string
    options: Array<{
      optionId: string
      label: string
      moq: number | null
      tiers: Array<{ minQuantity: number; maxQuantity: number | null; price: string }>
    }>
  }
}

interface WholesalePriceResponse {
  data: {
    productId: string
    productOptionId: string
    optionLabel: string
    quantity: number
    moq: number | null
    unitPrice: string
    tier: { minQuantity: number; maxQuantity: number | null; price: string }
  }
}

export async function getProductWholesalePricing(id: string, signal?: AbortSignal): Promise<ProductWholesalePricing> {
  const response = await request<ProductWholesalePricingResponse>(
    `/products/${encodeURIComponent(id)}/wholesale`,
    { signal },
  )
  return {
    productId: response.data.productId,
    options: response.data.options.map((option) => {
      if (option.moq !== null && (!Number.isInteger(option.moq) || option.moq < 1)) {
        throw new Error('The wholesale pricing data is invalid.')
      }
      return {
        optionId: option.optionId,
        label: option.label,
        moq: option.moq,
        tiers: option.tiers.map((tier) => {
          const price = Number(tier.price)
          if (!Number.isFinite(price) || price <= 0) {
            throw new Error('The wholesale pricing data is invalid.')
          }
          if (!Number.isInteger(tier.minQuantity) || tier.minQuantity < 1) {
            throw new Error('The wholesale pricing data is invalid.')
          }
          if (tier.maxQuantity !== null && (!Number.isInteger(tier.maxQuantity) || tier.maxQuantity < tier.minQuantity)) {
            throw new Error('The wholesale pricing data is invalid.')
          }
          return { minQuantity: tier.minQuantity, maxQuantity: tier.maxQuantity, price }
        }),
      }
    }),
  }
}

export async function getWholesaleUnitPrice(
  productId: string,
  productOptionId: string,
  quantity: number,
): Promise<WholesalePriceResult> {
  const response = await request<WholesalePriceResponse>('/products/wholesale-price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, productOptionId, quantity }),
  })
  const unitPrice = Number(response.data.unitPrice)
  const tierPrice = Number(response.data.tier.price)
  if (!Number.isFinite(unitPrice) || unitPrice <= 0 || !Number.isFinite(tierPrice) || tierPrice <= 0) {
    throw new Error('The wholesale pricing data is invalid.')
  }
  return {
    productId: response.data.productId,
    productOptionId: response.data.productOptionId,
    optionLabel: response.data.optionLabel,
    quantity: response.data.quantity,
    moq: response.data.moq,
    unitPrice,
    tier: {
      minQuantity: response.data.tier.minQuantity,
      maxQuantity: response.data.tier.maxQuantity,
      price: tierPrice,
    },
  }
}