import type { PaymentMethod } from '@prisma/client'

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