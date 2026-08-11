import type { PaymentSettings as PrismaPaymentSettings, StoreSettings as PrismaStoreSettings } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type { AdminPaymentSettings } from '../admin/admin.types.js'
import type {
  ContactInformation,
  PublicStoreSettings,
  StoreInformation,
  StoreSettings,
  UpdateContactInformationInput,
  UpdateStoreInformationInput,
} from './settings.types.js'

const SETTINGS_KEY = 'default'
const DEFAULT_STORE_SETTINGS = {
  businessName: 'Ayanfe Food Variety',
  businessEmail: 'Ayanfefoodvariety@gmail.com',
  businessPhone: '08125595879',
  whatsappNumber: '08125595879',
  address: '',
  description: '',
}

const toStoreSettings = (settings: PrismaStoreSettings): StoreSettings => ({
  businessName: settings.businessName,
  businessEmail: settings.businessEmail,
  businessPhone: settings.businessPhone,
  whatsappNumber: settings.whatsappNumber,
  address: settings.address,
  description: settings.description,
})

const toStoreInformation = (settings: PrismaStoreSettings): StoreInformation => ({
  businessName: settings.businessName,
  address: settings.address,
  description: settings.description,
})

const toContactInformation = (settings: PrismaStoreSettings): ContactInformation => ({
  businessEmail: settings.businessEmail,
  businessPhone: settings.businessPhone,
  whatsappNumber: settings.whatsappNumber,
})

const toPaymentSettings = (settings: PrismaPaymentSettings): AdminPaymentSettings => ({
  bankName: settings.bankName,
  accountName: settings.accountName,
  accountNumber: settings.accountNumber,
  instructions: settings.instructions,
})

const getSettings = () => prisma.storeSettings.findUnique({ where: { singletonKey: SETTINGS_KEY } })

export async function getAdminStoreInformation(): Promise<StoreInformation | null> {
  const settings = await getSettings()
  return settings ? toStoreInformation(settings) : {
    businessName: DEFAULT_STORE_SETTINGS.businessName,
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

export async function getPublicStoreSettings(): Promise<PublicStoreSettings> {
  const [store, payment] = await Promise.all([
    getSettings(),
    prisma.paymentSettings.findFirst({
      where: { singletonKey: SETTINGS_KEY, isActive: true },
      select: { bankName: true, accountName: true, accountNumber: true, instructions: true },
    }),
  ])
  return {
    store: store ? toStoreSettings(store) : DEFAULT_STORE_SETTINGS,
    payment: payment ?? null,
  }
}