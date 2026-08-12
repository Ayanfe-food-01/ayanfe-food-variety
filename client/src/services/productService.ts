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
  unit: string
  image: string
  isActive: boolean
  isAvailable: boolean
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

const toProduct = (product: ProductApiResponse): Product => {
  const price = Number(product.price)

  if (!Number.isFinite(price)) {
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
    image: product.image,
    description: product.description,
    availabilityStatus: product.availabilityStatus,
    isActive: product.isActive,
    isAvailable: product.isAvailable,
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
  const response = await request<ProductListResponse>(`/products${queryString ? `?${queryString}` : ''}`)
  return {
    products: response.data.products.map(toProduct),
    pagination: response.data.pagination,
  }
}

export async function getProduct(id: string): Promise<Product> {
  const response = await request<ProductResponse>(`/products/${encodeURIComponent(id)}`)
  return toProduct(response.data)
}