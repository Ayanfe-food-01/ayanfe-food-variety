import { request } from './api'
import type { Product, ProductOption } from '../types/product'
import type { Category } from '../types/category'
import type { PaymentMethod } from './orderService'

export interface DashboardStats {
  totalOrders: number
  orderPlacedOrders: number
  processingOrders: number
  deliveredOrders: number
  cancelledOrders: number
  pendingPaymentVerification: number
  verifiedPayments: number
  totalSales: string
}

export type AnalyticsRange = 'today' | 'week' | 'month' | 'year'

export interface AdminAnalytics {
  timezone: string
  range: AnalyticsRange
  summary: {
    todayRevenue: string
    weekRevenue: string
    monthRevenue: string
    yearRevenue: string
    totalOrders: number
  }
  metrics: {
    confirmedOrders: number
    pendingOrders: number
    cancelledOrders: number
    averageOrderValue: string
  }
  series: Array<{
    label: string
    revenue: string
    orders: number
  }>
}

export interface PaymentSettings {
  paymentMethod: PaymentMethod
  bankName: string
  accountName: string
  accountNumber: string
  instructions: string
  isActive: boolean
}

export interface StoreInformation {
  businessName: string
  callToOrderPhone: string
  announcementText: string
  address: string
  description: string
}

export interface StoreBranding {
  logoUrl: string | null
  faviconUrl: string | null
}

export interface ContactInformation {
  businessEmail: string
  businessPhone: string
  whatsappNumber: string
  openingHours: string
  pickupInformation: string
  deliveryInformation: string
  mapEmbedUrl: string
}

interface DashboardResponse {
  success: true
  data: { stats: DashboardStats }
}

interface AnalyticsResponse {
  success: true
  data: { analytics: AdminAnalytics }
}

interface SettingsResponse {
  success: true
  data: { settings: PaymentSettings | null }
}

interface StoreInformationResponse {
  success: true
  data: { settings: StoreInformation | null }
}

interface StoreBrandingResponse {
  success: true
  data: { branding: StoreBranding }
}

interface ContactInformationResponse {
  success: true
  data: { settings: ContactInformation | null }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await request<DashboardResponse>('/admin/dashboard')
  return response.data.stats
}

export async function getAdminAnalytics(range: AnalyticsRange = 'month'): Promise<AdminAnalytics> {
  const response = await request<AnalyticsResponse>(`/admin/analytics?range=${range}`)
  return response.data.analytics
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

export async function getStoreBranding(): Promise<StoreBranding> {
  const response = await request<StoreBrandingResponse>('/admin/settings/branding')
  return response.data.branding
}

export async function updateStoreBranding(input: {
  logo?: File
  favicon?: File
  removeLogo?: boolean
  removeFavicon?: boolean
}): Promise<StoreBranding> {
  const formData = new FormData()
  if (input.logo) formData.set('logo', input.logo)
  if (input.favicon) formData.set('favicon', input.favicon)
  if (input.removeLogo) formData.set('removeLogo', 'true')
  if (input.removeFavicon) formData.set('removeFavicon', 'true')
  const response = await request<StoreBrandingResponse>('/admin/settings/branding', {
    method: 'PUT',
    body: formData,
  })
  return response.data.branding
}

export interface AdminBanner {
  id: string
  title: string
  imageUrl: string
  promotionalText: string | null
  buttonText: string | null
  destination: string | null
  isActive: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface BannerInput {
  title: string
  promotionalText: string
  buttonText: string
  destination: string
  displayOrder: number
  isActive: boolean
  image?: File
}

interface AdminBannersResponse {
  success: true
  data: { banners: AdminBanner[] }
}

interface AdminBannerResponse {
  success: true
  data: { banner: AdminBanner }
}

const bannerFormDataFor = (input: BannerInput): FormData => {
  const formData = new FormData()
  formData.set('title', input.title)
  formData.set('promotionalText', input.promotionalText)
  formData.set('buttonText', input.buttonText)
  formData.set('destination', input.destination)
  formData.set('displayOrder', String(input.displayOrder))
  formData.set('isActive', String(input.isActive))
  if (input.image) formData.set('image', input.image)
  return formData
}

export async function getAdminBanners(): Promise<AdminBanner[]> {
  const response = await request<AdminBannersResponse>('/admin/banners')
  return response.data.banners
}

export async function getAdminBanner(id: string): Promise<AdminBanner> {
  const response = await request<AdminBannerResponse>(`/admin/banners/${encodeURIComponent(id)}`)
  return response.data.banner
}

export async function createAdminBanner(input: BannerInput): Promise<AdminBanner> {
  const response = await request<AdminBannerResponse>('/admin/banners', {
    method: 'POST',
    body: bannerFormDataFor(input),
  })
  return response.data.banner
}

export async function updateAdminBanner(id: string, input: BannerInput): Promise<AdminBanner> {
  const response = await request<AdminBannerResponse>(`/admin/banners/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: bannerFormDataFor(input),
  })
  return response.data.banner
}

export async function updateAdminBannerStatus(id: string, isActive: boolean): Promise<AdminBanner> {
  const response = await request<AdminBannerResponse>(`/admin/banners/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  })
  return response.data.banner
}

export async function deleteAdminBanner(id: string): Promise<void> {
  await request<{ success: true }>(`/admin/banners/${encodeURIComponent(id)}`, { method: 'DELETE' })
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

export interface AdminPasswordChangeInput {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface AdminPasswordChangeResponse {
  success: true
  data: { message: string }
}

export async function changeAdminPassword(input: AdminPasswordChangeInput): Promise<string> {
  const response = await request<AdminPasswordChangeResponse>('/admin/settings/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data.message
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

interface AdminProductOptionApiResponse {
  id: string
  label: string
  price: string
  stockQuantity: number
  sortOrder: number
  isActive: boolean
  wholesaleMoq: number | null
  wholesalePrices: Array<{
    id: string
    minQuantity: number
    maxQuantity: number | null
    price: string
  }>
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
  discountedPrice: string
  discountType: 'PERCENTAGE' | 'FIXED' | null
  discountValue: string | null
  deliveryFee: string
  unit: string
  image: string
  images?: string[]
  isActive: boolean
  isFeatured: boolean
  stockQuantity: number
  availabilityStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  isAvailable: boolean
  options?: AdminProductOptionApiResponse[]
  archivedOptions?: AdminProductOptionApiResponse[]
  createdAt: string
  updatedAt: string
}

export interface ProductOptionDraft {
  id?: string
  label: string
  price: string
  stockQuantity: string
  wholesaleMoq?: string
  wholesalePrices?: WholesaleTierDraft[]
}

export interface WholesaleTierDraft {
  id?: string
  minQuantity: string
  maxQuantity: string
  price: string
}

export const isFilledProductOption = (option: ProductOptionDraft): boolean =>
  option.label.trim() !== '' || option.price.trim() !== '' || option.stockQuantity.trim() !== ''

export interface ProductFormInput {
  name: string
  categoryId: string
  price: string
  discountType: '' | 'PERCENTAGE' | 'FIXED'
  discountValue: string
  deliveryFee: string
  unit: string
  description: string
  stockQuantity: string
  isActive: boolean
  isFeatured: boolean
  images: File[]
  existingImages: string[]
  imageOrder: string[]
  options: ProductOptionDraft[]
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
  const options = input.options.filter(isFilledProductOption)
  const hasOptions = options.length > 0
  formData.set('name', input.name)
  formData.set('categoryId', input.categoryId)
  formData.set('price', hasOptions ? '' : input.price)
  formData.set('discountType', hasOptions ? '' : input.discountType)
  formData.set('discountValue', hasOptions ? '' : input.discountValue)
  formData.set('deliveryFee', input.deliveryFee)
  formData.set('unit', input.unit)
  formData.set('description', input.description)
  formData.set('stockQuantity', hasOptions ? '' : input.stockQuantity)
  formData.set('isActive', String(input.isActive))
  formData.set('isFeatured', String(input.isFeatured))
  formData.set('existingImages', JSON.stringify(input.existingImages))
  formData.set('imageOrder', JSON.stringify(input.imageOrder))
  formData.set('options', JSON.stringify(options.map((option, sortOrder) => ({
    ...(option.id ? { id: option.id } : {}),
    label: option.label.trim(),
    price: option.price.trim(),
    stockQuantity: option.stockQuantity.trim() === '' ? 0 : Number(option.stockQuantity),
    sortOrder,
    wholesaleMoq: option.wholesaleMoq !== undefined && option.wholesaleMoq.trim() !== '' ? Number(option.wholesaleMoq) : null,
    wholesalePrices: (option.wholesalePrices ?? []).map((tier) => ({
      ...(tier.id ? { id: tier.id } : {}),
      minQuantity: tier.minQuantity.trim() === '' ? null : Number(tier.minQuantity),
      maxQuantity: tier.maxQuantity.trim() === '' ? null : Number(tier.maxQuantity),
      price: tier.price.trim(),
    })),
  }))))
  input.images.forEach((image) => formData.append('images', image))
  return formData
}

const toProductOption = (option: AdminProductOptionApiResponse): ProductOption => ({
  id: option.id,
  label: option.label,
  price: Number(option.price),
  stockQuantity: option.stockQuantity,
  sortOrder: option.sortOrder,
  isActive: option.isActive,
  wholesaleMoq: option.wholesaleMoq ?? null,
  wholesalePrices: (option.wholesalePrices ?? []).map((tier) => ({
    id: tier.id,
    minQuantity: tier.minQuantity,
    maxQuantity: tier.maxQuantity,
    price: Number(tier.price),
  })),
})

const toProduct = (product: AdminProductApiResponse): Product => ({
  id: product.id,
  categoryId: product.categoryId,
  name: product.name,
  category: product.categoryName,
  unit: product.unit,
  price: Number(product.price),
  discountedPrice: Number(product.discountedPrice),
  discountType: product.discountType,
  discountValue: product.discountValue === null ? null : Number(product.discountValue),
  deliveryFee: Number(product.deliveryFee),
  image: product.image,
  images: product.images?.filter(Boolean).length
    ? product.images.filter(Boolean)
    : product.image
      ? [product.image]
      : [],
  description: product.description,
  stockQuantity: product.stockQuantity,
  isActive: product.isActive,
  isFeatured: product.isFeatured,
  availabilityStatus: product.availabilityStatus,
  isAvailable: product.isAvailable,
    isWishlisted: false,
  options: (product.options ?? []).map(toProductOption),
  archivedOptions: (product.archivedOptions ?? []).map(toProductOption),
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

export async function updateAdminProductFeatured(id: string, isFeatured: boolean): Promise<Product> {
  const response = await request<AdminProductResponse>(`/admin/products/${encodeURIComponent(id)}/featured`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isFeatured }),
  })
  return toProduct(response.data.product)
}

export async function deleteAdminProduct(id: string): Promise<void> {
  await request<{ success: true }>(`/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export interface AdminTestimonial {
  id: string
  authorName: string
  content: string
  rating: number | null
  avatarUrl: string | null
  avatarPublicId: string | null
  isActive: boolean
  isFeatured: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface AdminTestimonialsQuery {
  page: number
  pageSize: number
  search?: string
  status?: 'active' | 'inactive'
  featured?: 'featured' | 'not-featured'
}

export interface AdminTestimonialsPage {
  testimonials: AdminTestimonial[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  featured: HomepageFeaturedMetrics
}

interface AdminTestimonialsResponse {
  success: true
  data: AdminTestimonialsPage
}

interface AdminTestimonialResponse {
  success: true
  data: { testimonial: AdminTestimonial }
}

export interface TestimonialInput {
  authorName: string
  content: string
  rating: string
  displayOrder: number
  isActive: boolean
  isFeatured: boolean
  avatar?: File
  removeAvatar?: boolean
}

const testimonialFormDataFor = (input: TestimonialInput): FormData => {
  const formData = new FormData()
  formData.set('authorName', input.authorName)
  formData.set('content', input.content)
  formData.set('rating', input.rating)
  formData.set('displayOrder', String(input.displayOrder))
  formData.set('isActive', String(input.isActive))
  formData.set('isFeatured', String(input.isFeatured))
  if (input.avatar) formData.set('avatar', input.avatar)
  if (input.removeAvatar) formData.set('removeAvatar', 'true')
  return formData
}

const adminTestimonialsQueryString = (query: AdminTestimonialsQuery): string => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  if (query.featured) params.set('featured', query.featured)
  return params.toString()
}

export async function getAdminTestimonials(query: AdminTestimonialsQuery): Promise<AdminTestimonialsPage> {
  const response = await request<AdminTestimonialsResponse>(`/admin/testimonials?${adminTestimonialsQueryString(query)}`)
  return response.data
}

export async function getAdminTestimonial(id: string): Promise<AdminTestimonial> {
  const response = await request<AdminTestimonialResponse>(`/admin/testimonials/${encodeURIComponent(id)}`)
  return response.data.testimonial
}

export async function createAdminTestimonial(input: TestimonialInput): Promise<AdminTestimonial> {
  const response = await request<AdminTestimonialResponse>('/admin/testimonials', {
    method: 'POST',
    body: testimonialFormDataFor(input),
  })
  return response.data.testimonial
}

export async function updateAdminTestimonial(id: string, input: TestimonialInput): Promise<AdminTestimonial> {
  const response = await request<AdminTestimonialResponse>(`/admin/testimonials/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: testimonialFormDataFor(input),
  })
  return response.data.testimonial
}

export async function deleteAdminTestimonial(id: string): Promise<void> {
  await request<{ success: true }>(`/admin/testimonials/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function updateAdminTestimonialStatus(id: string, isActive: boolean): Promise<AdminTestimonial> {
  const response = await request<AdminTestimonialResponse>(`/admin/testimonials/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  })
  return response.data.testimonial
}

export async function updateAdminTestimonialFeatured(id: string, isFeatured: boolean): Promise<AdminTestimonial> {
  const response = await request<AdminTestimonialResponse>(`/admin/testimonials/${encodeURIComponent(id)}/featured`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isFeatured }),
  })
  return response.data.testimonial
}

export interface HomepageFeaturedMetrics {
  used: number
  max: number
  remaining: number
}

export type AdminReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AdminReviewItem {
  id: string
  productId: string
  productName: string
  productSlug: string
  productImage: string
  productOptionLabel: string | null
  customerId: string | null
  customerName: string | null
  orderNumber: string
  rating: number
  content: string
  status: AdminReviewStatus
  verifiedPurchase: boolean
  isActive: boolean
  isFeatured: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface AdminReviewDetail extends AdminReviewItem {
  customerEmail: string | null
  productQuantity: number
  orderCreatedAt: string
}

export interface AdminReviewsQuery {
  page: number
  pageSize: number
  search?: string
  status?: 'pending' | 'approved' | 'rejected'
  verified?: 'verified' | 'not-verified'
  rating?: string
}

export interface AdminReviewsPage {
  reviews: AdminReviewItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  featured: HomepageFeaturedMetrics
}

interface AdminReviewsResponse {
  success: true
  data: AdminReviewsPage
}

interface AdminReviewResponse {
  success: true
  data: { review: AdminReviewDetail }
}

const adminReviewsQueryString = (query: AdminReviewsQuery): string => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  if (query.verified) params.set('verified', query.verified)
  if (query.rating) params.set('rating', query.rating)
  return params.toString()
}

export async function getAdminReviews(query: AdminReviewsQuery): Promise<AdminReviewsPage> {
  const response = await request<AdminReviewsResponse>(`/admin/reviews?${adminReviewsQueryString(query)}`)
  return response.data
}

export async function getAdminReview(id: string): Promise<AdminReviewDetail> {
  const response = await request<AdminReviewResponse>(`/admin/reviews/${encodeURIComponent(id)}`)
  return response.data.review
}

export async function updateAdminReviewStatus(
  id: string,
  status: 'APPROVED' | 'REJECTED',
): Promise<AdminReviewDetail> {
  const response = await request<AdminReviewResponse>(`/admin/reviews/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  return response.data.review
}

export async function updateAdminReviewFeatured(id: string, isFeatured: boolean): Promise<AdminReviewDetail> {
  const response = await request<AdminReviewResponse>(`/admin/reviews/${encodeURIComponent(id)}/featured`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isFeatured }),
  })
  return response.data.review
}

export async function updateAdminReviewOrder(id: string, displayOrder: number): Promise<AdminReviewDetail> {
  const response = await request<AdminReviewResponse>(`/admin/reviews/${encodeURIComponent(id)}/order`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayOrder }),
  })
  return response.data.review
}

export async function deleteAdminReview(id: string): Promise<void> {
  await request<{ success: true }>(`/admin/reviews/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: true }),
  })
}

export interface AdminDeliveryZone {
  id: string
  name: string
  fee: string
  freeDeliveryThreshold: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface AdminDeliveryZonesQuery {
  page: number
  pageSize: number
  search?: string
  status?: 'active' | 'inactive'
}

export interface AdminDeliveryZonesPage {
  zones: AdminDeliveryZone[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface DeliveryZoneInput {
  name: string
  fee: number
  freeDeliveryThreshold: number | null
  isActive: boolean
}

interface AdminDeliveryZonesResponse {
  success: true
  data: AdminDeliveryZonesPage
}

interface AdminDeliveryZoneResponse {
  success: true
  data: { zone: AdminDeliveryZone }
}

interface AdminDeliveryZonesReorderResponse {
  success: true
  data: { zones: AdminDeliveryZone[] }
}

const adminDeliveryZonesQueryString = (query: AdminDeliveryZonesQuery): string => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  return params.toString()
}

export async function getAdminDeliveryZones(query: AdminDeliveryZonesQuery): Promise<AdminDeliveryZonesPage> {
  const response = await request<AdminDeliveryZonesResponse>(`/admin/delivery-zones?${adminDeliveryZonesQueryString(query)}`)
  return response.data
}

export async function getAdminDeliveryZone(id: string): Promise<AdminDeliveryZone> {
  const response = await request<AdminDeliveryZoneResponse>(`/admin/delivery-zones/${encodeURIComponent(id)}`)
  return response.data.zone
}

export async function createAdminDeliveryZone(input: DeliveryZoneInput): Promise<AdminDeliveryZone> {
  const response = await request<AdminDeliveryZoneResponse>('/admin/delivery-zones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data.zone
}

export async function updateAdminDeliveryZone(id: string, input: DeliveryZoneInput): Promise<AdminDeliveryZone> {
  const response = await request<AdminDeliveryZoneResponse>(`/admin/delivery-zones/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data.zone
}

export async function updateAdminDeliveryZoneStatus(id: string, isActive: boolean): Promise<AdminDeliveryZone> {
  const response = await request<AdminDeliveryZoneResponse>(`/admin/delivery-zones/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  })
  return response.data.zone
}

export async function reorderAdminDeliveryZones(zoneIds: string[]): Promise<AdminDeliveryZone[]> {
  const response = await request<AdminDeliveryZonesReorderResponse>('/admin/delivery-zones/reorder', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zoneIds }),
  })
  return response.data.zones
}

export async function deleteAdminDeliveryZone(id: string): Promise<void> {
  await request<{ success: true }>(`/admin/delivery-zones/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}