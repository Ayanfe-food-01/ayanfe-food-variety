import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import { getPublicStoreSettings, type PaymentSettings } from '../../services/storeSettingsService'
import type { CheckoutFormData } from './types'

// Loads the store's available payment methods once and hydrates the selected
// method into the form when the stored choice is no longer offered.
export function useCheckoutPaymentSettings(
  setForm: (updater: (current: CheckoutFormData) => CheckoutFormData) => void,
) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentSettings[]>([])
  const [isPaymentLoading, setIsPaymentLoading] = useState(true)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  useEffect(() => {
    getPublicStoreSettings()
      .then((settings) => {
        const availableMethods = settings.paymentMethods.length > 0
          ? settings.paymentMethods
          : settings.payment
            ? [settings.payment]
            : []
        setPaymentMethods(availableMethods)
        setForm((currentForm) => ({
          ...currentForm,
          paymentMethod: availableMethods.some((method) => method.paymentMethod === currentForm.paymentMethod)
            ? currentForm.paymentMethod
            : (availableMethods[0]?.paymentMethod ?? currentForm.paymentMethod),
        }))
      })
      .catch((reason: unknown) => {
        setPaymentError(reason instanceof ApiError ? reason.message : 'Payment methods could not be loaded.')
      })
      .finally(() => setIsPaymentLoading(false))
  }, [setForm])

  return { paymentMethods, isPaymentLoading, paymentError }
}