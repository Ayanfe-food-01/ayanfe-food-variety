import { PaymentMethod } from '@prisma/client'
import type { PaymentSettings as PrismaPaymentSettings, StoreSettings as PrismaStoreSettings } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import type {
  ContactInformation,
  PaymentSettings,
  StoreBranding,
  StoreBrandingAssets,
  StoreInformation,
  StoreSettings,
} from './settings.types.js'

export const SETTINGS_KEY = 'default'

export const DEFAULT_STORE_SETTINGS = {
  businessName: 'Ayanfe Food Variety',
  businessEmail: 'Ayanfefoodvariety@gmail.com',
  businessPhone: '08125595879',
  whatsappNumber: '08125595879',
  callToOrderPhone: '08125595879',
  announcementText: 'Quality foodstuff, delivered with care',
  address: '',
  description: '',
  openingHours: '',
  pickupInformation: '',
  deliveryInformation: '',
  mapEmbedUrl: '',
  logoUrl: null,
  logoPublicId: null,
  faviconUrl: null,
  faviconPublicId: null,
}

export const toStoreSettings = (settings: PrismaStoreSettings): StoreSettings => ({
  businessName: settings.businessName,
  businessEmail: settings.businessEmail,
  businessPhone: settings.businessPhone,
  whatsappNumber: settings.whatsappNumber,
  callToOrderPhone: settings.callToOrderPhone,
  announcementText: settings.announcementText,
  address: settings.address,
  description: settings.description,
  openingHours: settings.openingHours,
  pickupInformation: settings.pickupInformation,
  deliveryInformation: settings.deliveryInformation,
  mapEmbedUrl: settings.mapEmbedUrl,
  logoUrl: settings.logoUrl,
  faviconUrl: settings.faviconUrl,
})

export const toStoreBranding = (settings: PrismaStoreSettings): StoreBranding => ({
  logoUrl: settings.logoUrl,
  faviconUrl: settings.faviconUrl,
})

export const toStoreBrandingAssets = (settings: PrismaStoreSettings): StoreBrandingAssets => ({
  logoUrl: settings.logoUrl,
  logoPublicId: settings.logoPublicId,
  faviconUrl: settings.faviconUrl,
  faviconPublicId: settings.faviconPublicId,
})

export const toStoreInformation = (settings: PrismaStoreSettings): StoreInformation => ({
  businessName: settings.businessName,
  callToOrderPhone: settings.callToOrderPhone,
  announcementText: settings.announcementText,
  address: settings.address,
  description: settings.description,
})

export const toContactInformation = (settings: PrismaStoreSettings): ContactInformation => ({
  businessEmail: settings.businessEmail,
  businessPhone: settings.businessPhone,
  whatsappNumber: settings.whatsappNumber,
  openingHours: settings.openingHours,
  pickupInformation: settings.pickupInformation,
  deliveryInformation: settings.deliveryInformation,
  mapEmbedUrl: settings.mapEmbedUrl,
})

export const toPaymentSettingsResponse = (settings: PrismaPaymentSettings): PaymentSettings => ({
  paymentMethod: settings.paymentMethod,
  bankName: settings.bankName,
  accountName: settings.accountName,
  accountNumber: settings.accountNumber,
  instructions: settings.instructions,
  isActive: settings.isActive,
})

export const getStoreSettings = () => prisma.storeSettings.findUnique({ where: { singletonKey: SETTINGS_KEY } })

export const getPaymentSettings = (paymentMethod: PaymentMethod = PaymentMethod.BANK_TRANSFER) =>
  prisma.paymentSettings.findUnique({
    where: { singletonKey_paymentMethod: { singletonKey: SETTINGS_KEY, paymentMethod } },
  })