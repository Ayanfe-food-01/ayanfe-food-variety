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

export interface StoreInformation {
  businessName: string
  address: string
  description: string
}

export interface ContactInformation {
  businessEmail: string
  businessPhone: string
  whatsappNumber: string
}

interface DashboardResponse {
  success: true
  data: { stats: DashboardStats }
}

interface SettingsResponse {
  success: true
  data: { settings: PaymentSettings | null }
}

interface StoreInformationResponse {
  success: true
  data: { settings: StoreInformation | null }
}

interface ContactInformationResponse {
  success: true
  data: { settings: ContactInformation | null }
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

export async function getStoreInformation(): Promise<StoreInformation | null> {
  const response = await request<StoreInformationResponse>('/admin/settings/store')
  return response.data.settings
}

export async function updateStoreInformation(settings: StoreInformation): Promise<StoreInformation> {
  const response = await request<StoreInformationResponse>('/admin/settings/store', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  if (!response.data.settings) throw new Error('Store information was not returned.')
  return response.data.settings
}

export async function getContactInformation(): Promise<ContactInformation | null> {
  const response = await request<ContactInformationResponse>('/admin/settings/contact')
  return response.data.settings
}

export async function updateContactInformation(settings: ContactInformation): Promise<ContactInformation> {
  const response = await request<ContactInformationResponse>('/admin/settings/contact', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  if (!response.data.settings) throw new Error('Contact information was not returned.')
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
  data: Category[] | { categories: Category[] }
}

export interface AdminCategoriesQuery {
  page: number
  pageSize: number
  search?: string
  status?: 'active' | 'inactive'
}

export interface AdminCategoriesPage {
  categories: Category[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

interface AdminCategoriesResponse {
  success: true
  data: {
    categories: Array<Category & { createdAt: string; updatedAt: string; productCount: number }>
    pagination: AdminCategoriesPage['pagination']
  }
}

interface AdminCategoryResponse {
  success: true
  data: { category: Category & { createdAt: string; updatedAt: string; productCount: number } }
}

export interface CategoryInput {
  name: string
  description: string
  isActive: boolean
  image?: File
}

const categoryFormDataFor = (input: CategoryInput): FormData => {
  const formData = new FormData()
  formData.set('name', input.name)
  formData.set('description', input.description)
  formData.set('isActive', String(input.isActive))
  if (input.image) formData.set('image', input.image)
  return formData
}

const adminCategoriesQueryString = (query: AdminCategoriesQuery): string => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  return params.toString()
}

export function getAdminCategories(): Promise<Category[]>
export function getAdminCategories(query: AdminCategoriesQuery): Promise<AdminCategoriesPage>
export async function getAdminCategories(query?: AdminCategoriesQuery): Promise<Category[] | AdminCategoriesPage> {
  if (!query) {
    const response = await request<CategoriesResponse>('/admin/categories')
    return Array.isArray(response.data) ? response.data : response.data.categories
  }
  const response = await request<AdminCategoriesResponse>(`/admin/categories?${adminCategoriesQueryString(query)}`)
  return {
    categories: response.data.categories,
    pagination: response.data.pagination,
  }
}

export async function getAdminCategory(id: string): Promise<Category> {
  const response = await request<AdminCategoryResponse>(`/admin/categories/${encodeURIComponent(id)}`)
  return response.data.category
}

export async function createAdminCategory(input: CategoryInput): Promise<Category> {
  const response = await request<AdminCategoryResponse>('/admin/categories', {
    method: 'POST',
    body: categoryFormDataFor(input),
  })
  return response.data.category
}

export async function updateAdminCategory(id: string, input: CategoryInput): Promise<Category> {
  const response = await request<AdminCategoryResponse>(`/admin/categories/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: categoryFormDataFor(input),
  })
  return response.data.category
}

export async function deleteAdminCategory(id: string): Promise<void> {
  await request<{ success: true }>(`/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function updateAdminCategoryStatus(id: string, isActive: boolean): Promise<Category> {
  const response = await request<AdminCategoryResponse>(`/admin/categories/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  })
  return response.data.category
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
  availabilityStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
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
  availabilityStatus: product.availabilityStatus,
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