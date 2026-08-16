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