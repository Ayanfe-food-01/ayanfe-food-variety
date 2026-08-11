import type { AdminPaymentSettings } from '../admin/admin.types.js'

export interface StoreSettings {
  businessName: string
  businessEmail: string
  businessPhone: string
  whatsappNumber: string
  address: string
  description: string
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

export interface PublicStoreSettings {
  store: StoreSettings | null
  payment: AdminPaymentSettings | null
}

export interface UpdateStoreInformationInput extends StoreInformation {}
export interface UpdateContactInformationInput extends ContactInformation {}