import { PaymentMethod, type PaymentSettings as PrismaPaymentSettings, type StoreSettings as PrismaStoreSettings } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type {
  ContactInformation,
  PaymentSettings,
  PublicStoreSettings,
  StoreInformation,
  StoreSettings,
  UpdateContactInformationInput,
  UpdatePaymentSettingsInput,
  UpdateStoreInformationInput,
} from './settings.types.js'

const SETTINGS_KEY = 'default'
const DEFAULT_STORE_SETTINGS = {
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
}

const toStoreSettings = (settings: PrismaStoreSettings): StoreSettings => ({
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
})

const toStoreInformation = (settings: PrismaStoreSettings): StoreInformation => ({
  businessName: settings.businessName,
  callToOrderPhone: settings.callToOrderPhone,
  announcementText: settings.announcementText,
  address: settings.address,
  description: settings.description,
})

const toContactInformation = (settings: PrismaStoreSettings): ContactInformation => ({
  businessEmail: settings.businessEmail,
  businessPhone: settings.businessPhone,
  whatsappNumber: settings.whatsappNumber,
  openingHours: settings.openingHours,
  pickupInformation: settings.pickupInformation,
  deliveryInformation: settings.deliveryInformation,
  mapEmbedUrl: settings.mapEmbedUrl,
})

const toPaymentSettings = (settings: PrismaPaymentSettings): PaymentSettings => ({
  paymentMethod: settings.paymentMethod,
  bankName: settings.bankName,
  accountName: settings.accountName,
  accountNumber: settings.accountNumber,
  instructions: settings.instructions,
  isActive: settings.isActive,
})

const getSettings = () => prisma.storeSettings.findUnique({ where: { singletonKey: SETTINGS_KEY } })
const getPaymentSettings = (paymentMethod: PaymentMethod = PaymentMethod.BANK_TRANSFER) =>
  prisma.paymentSettings.findUnique({
    where: { singletonKey_paymentMethod: { singletonKey: SETTINGS_KEY, paymentMethod } },
  })

export async function getAdminStoreInformation(): Promise<StoreInformation | null> {
  const settings = await getSettings()
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

export async function getAdminContactInformation(): Promise<ContactInformation | null> {
  const settings = await getSettings()
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
  const settings = await getSettings()
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

export async function getAdminPaymentSettings(): Promise<PaymentSettings | null> {
  const settings = await getPaymentSettings()
  return settings ? toPaymentSettings(settings) : null
}

export async function updateAdminPaymentSettings(input: UpdatePaymentSettingsInput): Promise<PaymentSettings> {
  const settings = await prisma.paymentSettings.upsert({
    where: {
      singletonKey_paymentMethod: {
        singletonKey: SETTINGS_KEY,
        paymentMethod: input.paymentMethod,
      },
    },
    create: { singletonKey: SETTINGS_KEY, ...input },
    update: input,
  })
  return toPaymentSettings(settings)
}

export async function getPublicPaymentSettings(): Promise<PaymentSettings | null> {
  const settings = await prisma.paymentSettings.findFirst({
    where: { singletonKey: SETTINGS_KEY, paymentMethod: PaymentMethod.BANK_TRANSFER, isActive: true },
  })
  return settings ? toPaymentSettings(settings) : null
}

export async function getPublicStoreSettings(): Promise<PublicStoreSettings> {
  const [store, paymentMethods] = await Promise.all([
    getSettings(),
    prisma.paymentSettings.findMany({
      where: { singletonKey: SETTINGS_KEY, isActive: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])
  const publicPaymentMethods = paymentMethods.map(toPaymentSettings)
  return {
    store: store ? toStoreSettings(store) : DEFAULT_STORE_SETTINGS,
    payment: publicPaymentMethods.find((method) => method.paymentMethod === PaymentMethod.BANK_TRANSFER) ?? null,
    paymentMethods: publicPaymentMethods,
  }
}