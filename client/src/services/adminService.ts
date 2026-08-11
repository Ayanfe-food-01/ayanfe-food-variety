import { request } from './api'
import type { Product } from '../types/product'
import type { Category } from '../types/category'

export interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  processingOrders: number
  completedOrders: number
  cancelledOrders: number
  pendingPaymentVerification: number
  verifiedPayments: number
  totalSales: string
}

export interface PaymentSettings {
  bankName: string
  accountName: string
  accountNumber: string
  instructions: string
}

interface DashboardResponse {
  success: true
  data: { stats: DashboardStats }
}

interface SettingsResponse {
  success: true
  data: { settings: PaymentSettings | null }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await request<DashboardResponse>('/admin/dashboard')
  return response.data.stats
}

export async function getPaymentSettings(): Promise<PaymentSettings | null> {
  const response = await request<SettingsResponse>('/admin/settings/payment')
  return response.data.settings
}

export async function updatePaymentSettings(settings: PaymentSettings): Promise<PaymentSettings> {
  const response = await request<SettingsResponse>('/admin/settings/payment', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  if (!response.data.settings) throw new Error('Payment settings were not returned.')
  return response.data.settings
}

export interface AdminProductsQuery {
  page: number
  pageSize: number
  search?: string
  categoryId?: string
  availability?: 'active' | 'inactive' | 'out-of-stock'
}

export interface AdminProductsPage {
  products: Product[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

interface AdminProductsResponse {
  success: true
  data: {
    products: AdminProductApiResponse[]
    pagination: AdminProductsPage['pagination']
  }
}

interface AdminProductResponse {
  success: true
  data: { product: AdminProductApiResponse }
}

interface CategoriesResponse {
  data: Category[]
}

interface AdminProductApiResponse {
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
  stockQuantity: number
  isAvailable: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductFormInput {
  name: string
  categoryId: string
  price: string
  unit: string
  description: string
  stockQuantity: string
  isActive: boolean
  image?: File
}

const toQueryString = (query: AdminProductsQuery): string => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  if (query.search) params.set('search', query.search)
  if (query.categoryId) params.set('categoryId', query.categoryId)
  if (query.availability) params.set('availability', query.availability)
  return params.toString()
}

const formDataFor = (input: ProductFormInput): FormData => {
  const formData = new FormData()
  formData.set('name', input.name)
  formData.set('categoryId', input.categoryId)
  formData.set('price', input.price)
  formData.set('unit', input.unit)
  formData.set('description', input.description)
  formData.set('stockQuantity', input.stockQuantity)
  formData.set('isActive', String(input.isActive))
  if (input.image) formData.set('image', input.image)
  return formData
}

const toProduct = (product: AdminProductApiResponse): Product => ({
  id: product.id,
  categoryId: product.categoryId,
  name: product.name,
  category: product.categoryName,
  unit: product.unit,
  price: Number(product.price),
  image: product.image,
  description: product.description,
  stockQuantity: product.stockQuantity,
  isActive: product.isActive,
  isAvailable: product.isAvailable,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
})

export async function getAdminProducts(query: AdminProductsQuery): Promise<AdminProductsPage> {
  const response = await request<AdminProductsResponse>(`/admin/products?${toQueryString(query)}`)
  return { ...response.data, products: response.data.products.map(toProduct) }
}

export async function getAdminProduct(id: string): Promise<Product> {
  const response = await request<AdminProductResponse>(`/admin/products/${encodeURIComponent(id)}`)
  return toProduct(response.data.product)
}

export async function getAdminCategories(): Promise<Category[]> {
  const response = await request<CategoriesResponse>('/categories')
  return response.data
}

export async function createAdminProduct(input: ProductFormInput): Promise<Product> {
  const response = await request<AdminProductResponse>('/admin/products', {
    method: 'POST',
    body: formDataFor(input),
  })
  return toProduct(response.data.product)
}

export async function updateAdminProduct(id: string, input: ProductFormInput): Promise<Product> {
  const response = await request<AdminProductResponse>(`/admin/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: formDataFor(input),
  })
  return toProduct(response.data.product)
}

export async function updateAdminProductStatus(id: string, isActive: boolean): Promise<Product> {
  const response = await request<AdminProductResponse>(`/admin/products/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  })
  return toProduct(response.data.product)
}