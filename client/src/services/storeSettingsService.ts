import type { PaymentMethod } from './orderService'

import { request } from './api'

export interface StoreSettings {
  businessName: string
  businessEmail: string
  businessPhone: string
  whatsappNumber: string
  callToOrderPhone: string
  announcementText: string
  address: string
  description: string
  openingHours: string
  pickupInformation: string
  deliveryInformation: string
  mapEmbedUrl: string
  logoUrl: string | null
  faviconUrl: string | null
}

export interface PublicStoreSettings {
  store: StoreSettings | null
  payment: PaymentSettings | null
  paymentMethods: PaymentSettings[]
}

export interface PaymentSettings {
  paymentMethod: PaymentMethod
  bankName: string
  accountName: string
  accountNumber: string
  instructions: string
  isActive: boolean
}

export interface PromotionalBanner {
  id: string
  title: string
  imageUrl: string
  promotionalText: string | null
  buttonText: string | null
  destination: string | null
}

interface PublicStoreSettingsResponse {
  success: true
  data: PublicStoreSettings
}

export async function getPublicStoreSettings(): Promise<PublicStoreSettings> {
  const response = await request<PublicStoreSettingsResponse>('/store/settings')
  return response.data
}

interface PublicBannersResponse {
  success: true
  data: { banners: PromotionalBanner[] }
}

export async function getPublicBanners(): Promise<PromotionalBanner[]> {
  const response = await request<PublicBannersResponse>('/store/banners')
  return response.data.banners
}

export interface CustomerStory {
  id: string
  type: 'testimonial' | 'review'
  authorName: string
  content: string
  rating: number | null
  verifiedPurchase: boolean
  createdAt: string
}

interface PublicCustomerStoriesResponse {
  success: true
  data: {
    items: CustomerStory[]
    sources: { testimonials: number; reviews: number }
  }
}

const toCustomerStory = (item: unknown): CustomerStory => {
  if (!item || typeof item !== 'object') throw new Error('The customer story data is invalid.')
  const record = item as Record<string, unknown>
  if (
    typeof record.id !== 'string'
    || (record.type !== 'testimonial' && record.type !== 'review')
    || typeof record.authorName !== 'string'
    || typeof record.content !== 'string'
    || (record.rating !== null && (typeof record.rating !== 'number' || !Number.isInteger(record.rating)))
    || typeof record.createdAt !== 'string'
  ) {
    throw new Error('The customer story data is invalid.')
  }
  if (record.type === 'review' && typeof record.verifiedPurchase !== 'boolean') {
    throw new Error('The customer story data is invalid.')
  }
  return {
    id: record.id,
    type: record.type,
    authorName: record.authorName,
    content: record.content,
    rating: record.rating as number | null,
    verifiedPurchase: record.type === 'review' ? (record.verifiedPurchase as boolean) : false,
    createdAt: record.createdAt,
  }
}

export async function getPublicCustomerStories(): Promise<CustomerStory[]> {
  const response = await request<PublicCustomerStoriesResponse>('/store/customer-stories')
  if (!Array.isArray(response.data.items)) throw new Error('The customer story data is invalid.')
  return response.data.items.map(toCustomerStory)
}