import type { PaymentMethod } from './orderService'

import { request } from './api'

export interface StoreSettings {
  businessName: string
  businessEmail: string
  businessPhone: string
  whatsappNumber: string
  callToOrderPhone: string
  announcementText: string
  heroImage: string | null
  address: string
  description: string
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

interface PublicStoreSettingsResponse {
  success: true
  data: PublicStoreSettings
}

export async function getPublicStoreSettings(): Promise<PublicStoreSettings> {
  const response = await request<PublicStoreSettingsResponse>('/store/settings')
  return response.data
}