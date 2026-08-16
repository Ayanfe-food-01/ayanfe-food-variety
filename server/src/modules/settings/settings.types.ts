import type { PaymentMethod } from '@prisma/client'

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

export interface StoreBranding {
  logoUrl: string | null
  faviconUrl: string | null
}

export interface StoreBrandingAssets extends StoreBranding {
  logoPublicId: string | null
  faviconPublicId: string | null
}

export interface StoredBrandingImage {
  url: string
  publicId: string
}

export interface UpdateStoreBrandingInput {
  logo?: StoredBrandingImage
  favicon?: StoredBrandingImage
}

export interface StoreInformation {
  businessName: string
  callToOrderPhone: string
  announcementText: string
  address: string
  description: string
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

export interface PaymentSettings {
  paymentMethod: PaymentMethod
  bankName: string
  accountName: string
  accountNumber: string
  instructions: string
  isActive: boolean
}

export interface PublicStoreSettings {
  store: StoreSettings | null
  payment: PaymentSettings | null
  paymentMethods: PaymentSettings[]
}

export interface UpdateStoreInformationInput extends StoreInformation {}
export interface UpdateContactInformationInput extends ContactInformation {}
export interface UpdatePaymentSettingsInput extends PaymentSettings {}