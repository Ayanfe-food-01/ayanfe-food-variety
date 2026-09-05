import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { ApiError } from '../../services/api'
import {
  getDeliveryLocationStates,
  resolveDeliveryZone,
  type DeliveryLocationState,
  type ResolvedDeliveryZone,
} from '../../services/orderService'
import { getPublicStoreSettings, type PaymentSettings } from '../../services/storeSettingsService'
import { createRequestKey } from '../../utils/browserCompatibility'
import { clearGuestCheckout, isGuestCheckoutMarked, markGuestCheckout } from '../../utils/guestCheckout'
import { deliveryFeeFromZone, calculateCheckoutTotals } from './checkoutCalculations'
import { validateStep } from './checkoutValidation'
import { nextCheckoutStep, previousCheckoutStep } from './checkoutSteps'
import { useCheckoutOrder } from './useCheckoutOrder'
import {
  CHECKOUT_DRAFT_STORAGE_KEY,
  CHECKOUT_KEY_STORAGE_KEY,
  GUEST_ACCESS_TOKEN_STORAGE_KEY,
  readCheckoutDraft,
  readSessionValue,
  writeSessionValue,
} from './checkoutSession'
import type { CartItem } from '../../context/cartContext'
import type { CheckoutField, CheckoutFormData, CheckoutFormErrors, CheckoutStep } from './types'

export interface UseCheckoutWizardDeps {
  items: CartItem[]
  subtotal: number
  canCheckout: boolean
  isCartLoading: boolean
  refreshCart: () => Promise<void>
}

export function useCheckoutWizard({ items, subtotal, canCheckout, isCartLoading, refreshCart }: UseCheckoutWizardDeps) {
  const { user, isLoading: isCustomerAuthLoading, openAuth } = useCustomerAuth()
  const location = useLocation()

  const [step, setStep] = useState<CheckoutStep>('contact')
  const [form, setForm] = useState<CheckoutFormData>(readCheckoutDraft)
  const [errors, setErrors] = useState<CheckoutFormErrors>({})
  const [paymentMethods, setPaymentMethods] = useState<PaymentSettings[]>([])
  const [isPaymentLoading, setIsPaymentLoading] = useState(true)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [resolvedZone, setResolvedZone] = useState<ResolvedDeliveryZone | null>(null)
  const [isZoneResolving, setIsZoneResolving] = useState(false)
  const [zoneError, setZoneError] = useState<string | null>(null)
  const [locations, setLocations] = useState<DeliveryLocationState[] | null>(null)
  const [locationsLoading, setLocationsLoading] = useState(false)
  const [locationsError, setLocationsError] = useState<string | null>(null)
  const [checkoutKey] = useState(() => readSessionValue(CHECKOUT_KEY_STORAGE_KEY) ?? createRequestKey())
  const [guestAccessToken] = useState(() => readSessionValue(GUEST_ACCESS_TOKEN_STORAGE_KEY) ?? createRequestKey())

  const guestCheckout = Boolean(
    !user
    && (
      isGuestCheckoutMarked()
      || (
        location.state
        && typeof location.state === 'object'
        && 'guestCheckout' in location.state
        && location.state.guestCheckout === true
      )
    ),
  )

  const { placeOrder, submitError, needsCartReview, isSubmitting, clearSubmissionState } = useCheckoutOrder({
    items,
    canCheckout,
    isCartLoading,
    refreshCart,
    form,
    resolvedZone,
    isZoneResolving,
    paymentSettings: paymentMethods.find((method) => method.paymentMethod === form.paymentMethod) ?? null,
    paymentError,
    checkoutKey,
    guestAccessToken,
    user,
    guestCheckout,
    openAuth,
    onInvalidStep: (target) => setStep(target),
  })

  useEffect(() => {
    writeSessionValue(CHECKOUT_KEY_STORAGE_KEY, checkoutKey)
    writeSessionValue(GUEST_ACCESS_TOKEN_STORAGE_KEY, guestAccessToken)
  }, [checkoutKey, guestAccessToken])

  useEffect(() => {
    if (guestCheckout) markGuestCheckout()
    if (user) clearGuestCheckout()
  }, [guestCheckout, user])

  useEffect(() => {
    writeSessionValue(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(form))
  }, [form])

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
  }, [])

  // Resolve the delivery zone for the selected city. Only runs when the city
  // changes with DELIVERY selected. Skips when city is empty.
  useEffect(() => {
    if (form.fulfillmentMethod !== 'DELIVERY' || !form.city.trim()) return

    let cancelled = false
    // The resolving flag must flip immediately when the city changes; this is
    // intentional and not a cascading-render concern because the fee display
    // reads it only after the async resolution settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsZoneResolving(true)

    resolveDeliveryZone(form.city, form.cityId || undefined, form.areaId || undefined)
      .then((zone) => {
        if (cancelled) return
        setResolvedZone(zone)
        setZoneError(zone ? null : 'No delivery zone covers your selected location.')
      })
      .catch(() => {
        if (cancelled) return
        setResolvedZone(null)
        setZoneError('Could not determine your delivery zone. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setIsZoneResolving(false)
      })

    return () => { cancelled = true }
  }, [form.fulfillmentMethod, form.city, form.cityId, form.areaId])

  useEffect(() => {
    if (!user) return
    // This effect intentionally hydrates editable local fields from the session profile.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((currentForm) => ({
      ...currentForm,
      fullName: currentForm.fullName || user.name,
      phone: currentForm.phone || user.phone || '',
      email: user.email,
    }))
  }, [user])

  const loadLocations = useCallback(() => {
    setLocationsLoading(true)
    setLocationsError(null)
    getDeliveryLocationStates()
      .then((loaded) => setLocations(loaded))
      .catch((caught: unknown) => {
        setLocationsError(caught instanceof ApiError ? caught.message : 'Locations could not be loaded.')
      })
      .finally(() => setLocationsLoading(false))
  }, [])

  useEffect(() => {
    // Boot the location list once it is needed: as soon as the customer picks
    // delivery, or when the delivery/review steps are reached. Kept lazy so
    // pickup-only checkouts do not hit the reference API unnecessarily.
    if (
      locations === null
      && !locationsError
      && !locationsLoading
      && (form.fulfillmentMethod === 'DELIVERY' || step === 'delivery' || step === 'review')
    ) {
      // setState is intentional here because the picker must lazy-load from the API.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadLocations()
    }
  }, [locations, locationsError, locationsLoading, form.fulfillmentMethod, step, loadLocations])

  const updateField = (field: CheckoutField, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
    if (errors[field]) {
      setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }))
    }
    clearSubmissionState()
  }

  const goToStep = (target: CheckoutStep, validateCurrent: boolean) => {
    if (validateCurrent) {
      const currentErrors = validateStep(step, form)
      setErrors(currentErrors)
      if (Object.keys(currentErrors).length > 0) return
    }
    setStep(target)
    window.scrollTo(0, 0)
  }

  const handleContinue = () => {
    const target = nextCheckoutStep(step)
    if (target) goToStep(target, true)
  }

  const handleBack = () => {
    const target = previousCheckoutStep(step)
    if (target) setStep(target)
    window.scrollTo(0, 0)
  }

  const paymentSettings = paymentMethods.find((method) => method.paymentMethod === form.paymentMethod) ?? null
  const deliveryFee = deliveryFeeFromZone(resolvedZone, subtotal)
  const { deliveryFee: checkoutDeliveryFee } = calculateCheckoutTotals(
    subtotal,
    form.fulfillmentMethod,
    deliveryFee,
  )

  return {
    step,
    form,
    errors,
    submitError,
    needsCartReview,
    isSubmitting,
    isCustomerAuthLoading,
    isAuthenticated: Boolean(user),
    paymentMethods,
    isPaymentLoading,
    paymentError,
    paymentSettings,
    resolvedZone,
    isZoneResolving,
    zoneError,
    deliveryFee,
    checkoutDeliveryFee,
    locations,
    locationsLoading,
    locationsError,
    updateField,
    handleContinue,
    handleBack,
    goToStep,
    placeOrder,
    loadLocations,
  }
}