import { prisma } from '../../config/prisma.js'
import type {
  ContactInformation,
  StoreBranding,
  StoreBrandingAssets,
  StoreInformation,
  UpdateContactInformationInput,
  UpdateStoreBrandingInput,
  UpdateStoreInformationInput,
} from './settings.types.js'
import {
  DEFAULT_STORE_SETTINGS,
  getStoreSettings,
  toContactInformation,
  toStoreBranding,
  toStoreBrandingAssets,
  toStoreInformation,
  SETTINGS_KEY,
} from './settings.mapper.js'

export async function getAdminStoreInformation(): Promise<StoreInformation | null> {
  const settings = await getStoreSettings()
  return settings ? toStoreInformation(settings) : {
    businessName: DEFAULT_STORE_SETTINGS.businessName,
    callToOrderPhone: DEFAULT_STORE_SETTINGS.callToOrderPhone,
    announcementText: DEFAULT_STORE_SETTINGS.announcementText,
    address: DEFAULT_STORE_SETTINGS.address,
    description: DEFAULT_STORE_SETTINGS.description,
  }
}

export async function updateAdminStoreInformation(input: UpdateStoreInformationInput): Promise<StoreInformation> {
  const settings = await prisma.storeSettings.upsert({
    where: { singletonKey: SETTINGS_KEY },
    create: {
      singletonKey: SETTINGS_KEY,
      businessName: input.businessName,
      address: input.address,
      description: input.description,
      businessEmail: DEFAULT_STORE_SETTINGS.businessEmail,
      businessPhone: DEFAULT_STORE_SETTINGS.businessPhone,
      whatsappNumber: DEFAULT_STORE_SETTINGS.whatsappNumber,
      callToOrderPhone: input.callToOrderPhone,
      announcementText: input.announcementText,
    },
    update: input,
  })
  return toStoreInformation(settings)
}

export async function getAdminStoreBranding(): Promise<StoreBranding> {
  const settings = await getStoreSettings()
  return settings ? toStoreBranding(settings) : { logoUrl: null, faviconUrl: null }
}

export async function getAdminStoreBrandingAssets(): Promise<StoreBrandingAssets> {
  const settings = await getStoreSettings()
  return settings
    ? toStoreBrandingAssets(settings)
    : { logoUrl: null, logoPublicId: null, faviconUrl: null, faviconPublicId: null }
}

export async function updateAdminStoreBranding(input: UpdateStoreBrandingInput): Promise<StoreBranding> {
  const data = {
    ...(input.logo ? { logoUrl: input.logo.url, logoPublicId: input.logo.publicId } : {}),
    ...(input.removeLogo ? { logoUrl: null, logoPublicId: null } : {}),
    ...(input.favicon ? { faviconUrl: input.favicon.url, faviconPublicId: input.favicon.publicId } : {}),
    ...(input.removeFavicon ? { faviconUrl: null, faviconPublicId: null } : {}),
  }
  const settings = await getStoreSettings()
  const updated = settings
    ? await prisma.storeSettings.update({ where: { singletonKey: SETTINGS_KEY }, data })
    : await prisma.storeSettings.create({
        data: {
          singletonKey: SETTINGS_KEY,
          ...DEFAULT_STORE_SETTINGS,
          ...data,
        },
      })
  return toStoreBranding(updated)
}

export async function getAdminContactInformation(): Promise<ContactInformation | null> {
  const settings = await getStoreSettings()
  return settings ? toContactInformation(settings) : {
    businessEmail: DEFAULT_STORE_SETTINGS.businessEmail,
    businessPhone: DEFAULT_STORE_SETTINGS.businessPhone,
    whatsappNumber: DEFAULT_STORE_SETTINGS.whatsappNumber,
    openingHours: DEFAULT_STORE_SETTINGS.openingHours,
    pickupInformation: DEFAULT_STORE_SETTINGS.pickupInformation,
    deliveryInformation: DEFAULT_STORE_SETTINGS.deliveryInformation,
    mapEmbedUrl: DEFAULT_STORE_SETTINGS.mapEmbedUrl,
  }
}

export async function updateAdminContactInformation(input: UpdateContactInformationInput): Promise<ContactInformation> {
  const settings = await getStoreSettings()
  const updated = settings
    ? await prisma.storeSettings.update({
        where: { singletonKey: SETTINGS_KEY },
        data: input,
      })
    : await prisma.storeSettings.create({
        data: {
          singletonKey: SETTINGS_KEY,
          ...input,
          ...DEFAULT_STORE_SETTINGS,
          ...input,
        },
      })
  return toContactInformation(updated)
}