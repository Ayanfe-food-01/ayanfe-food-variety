import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import { getPublicStoreSettings, type PaymentSettings } from '../../services/storeSettingsService'
import type { PaymentMethod } from '../../services/orderService'

export function useQuotePaymentMethods(
  onPaymentMethod: (next: PaymentMethod) => void,
) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentSettings[]>([])
  const [isPaymentLoading, setIsPaymentLoading] = useState(true)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  useEffect(() => {
    getPublicStoreSettings()
      .then((settings) => {
        const available = settings.paymentMethods.length > 0
          ? settings.paymentMethods
          : settings.payment
            ? [settings.payment]
            : []
        setPaymentMethods(available)
        onPaymentMethod(available[0]?.paymentMethod ?? 'BANK_TRANSFER')
      })
      .catch((reason: unknown) => {
        setPaymentError(reason instanceof ApiError ? reason.message : 'Payment methods could not be loaded.')
      })
      .finally(() => setIsPaymentLoading(false))
  }, [onPaymentMethod])

  return { paymentMethods, isPaymentLoading, paymentError }
}