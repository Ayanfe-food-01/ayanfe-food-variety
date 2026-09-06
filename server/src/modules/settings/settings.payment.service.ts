import { PaymentMethod } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import type { PaymentSettings, UpdatePaymentSettingsInput } from './settings.types.js'
import { getPaymentSettings, toPaymentSettingsResponse, SETTINGS_KEY } from './settings.mapper.js'

export async function getAdminPaymentSettings(): Promise<PaymentSettings | null> {
  const settings = await getPaymentSettings()
  return settings ? toPaymentSettingsResponse(settings) : null
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
  return toPaymentSettingsResponse(settings)
}

export async function getPublicPaymentSettings(): Promise<PaymentSettings | null> {
  const settings = await prisma.paymentSettings.findFirst({
    where: { singletonKey: SETTINGS_KEY, paymentMethod: PaymentMethod.BANK_TRANSFER, isActive: true },
  })
  return settings ? toPaymentSettingsResponse(settings) : null
}