import { PaymentMethod } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { isOnlinePaymentEnabled } from '../payments/payment.provider.js'
import type { PublicStoreSettings } from './settings.types.js'
import {
  DEFAULT_STORE_SETTINGS,
  getStoreSettings,
  toPaymentSettingsResponse,
  toStoreSettings,
  SETTINGS_KEY,
} from './settings.mapper.js'

export async function getPublicStoreSettings(): Promise<PublicStoreSettings> {
  const [store, paymentMethods] = await Promise.all([
    getStoreSettings(),
    prisma.paymentSettings.findMany({
      where: { singletonKey: SETTINGS_KEY, isActive: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])
  const publicPaymentMethods = paymentMethods.map(toPaymentSettingsResponse)
  // When the online gateway is enabled and configured, surface it as an
  // available checkout method. It is an implicit option, not a stored row: the
  // gateway requires no bank details to snapshot into an order.
  if (isOnlinePaymentEnabled()) {
    publicPaymentMethods.push({
      paymentMethod: PaymentMethod.PAYSTACK,
      bankName: '',
      accountName: '',
      accountNumber: '',
      instructions: '',
      isActive: true,
    })
  }
  return {
    store: store ? toStoreSettings(store) : DEFAULT_STORE_SETTINGS,
    payment: publicPaymentMethods.find((method) => method.paymentMethod === PaymentMethod.BANK_TRANSFER) ?? null,
    paymentMethods: publicPaymentMethods,
  }
}