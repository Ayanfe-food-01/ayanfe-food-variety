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
  createdAt: string
  updatedAt: string
}

interface ProductListResponse {
  data: ProductApiResponse[]
}

interface ProductResponse {
  data: ProductApiResponse
}

const toProduct = (product: ProductApiResponse): Product => {
  const price = Number(product.price)

  if (!Number.isFinite(price)) {
    throw new Error('The product data is invalid.')
  }

  return {
    id: product.id,
    name: product.name,
    category: product.categoryName,
    unit: product.unit,
    price,
    image: product.image,
    description: product.description,
  }
}

export async function getProducts(): Promise<Product[]> {
  const response = await request<ProductListResponse>('/products')
  return response.data.map(toProduct)
}

export async function getProduct(id: string): Promise<Product> {
  const response = await request<ProductResponse>(`/products/${encodeURIComponent(id)}`)
  return toProduct(response.data)
}