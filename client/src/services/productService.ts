import { request } from './api'
import type { Product } from '../types/product'

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
  createdAt: string
  updatedAt: string
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
  ) {
    throw new Error('The product data is invalid.')
  }

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