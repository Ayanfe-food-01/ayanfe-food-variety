import { request } from './api'

export interface StoreSettings {
  businessName: string
  businessEmail: string
  businessPhone: string
  whatsappNumber: string
  address: string
  description: string
}

export interface PublicStoreSettings {
  store: StoreSettings | null
  payment: {
    bankName: string
    accountName: string
    accountNumber: string
    instructions: string
  } | null
}

interface PublicStoreSettingsResponse {
  success: true
  data: PublicStoreSettings
}

export async function getPublicStoreSettings(): Promise<PublicStoreSettings> {
  const response = await request<PublicStoreSettingsResponse>('/store/settings')
  return response.data
}