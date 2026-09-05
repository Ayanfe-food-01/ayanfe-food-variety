import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthenticatedUser } from '../../services/authService'
import { ApiError } from '../../services/api'
import {
  checkoutCustomerCart,
  type FulfillmentMethod,
  type ResolvedDeliveryZone,
} from '../../services/orderService'
import type { PaymentSettings } from '../../services/storeSettingsService'
import { initializeGuestPaystackPayment, initializePaystackPayment } from '../../services/paymentService'
import { saveGuestOrderAccessToken } from '../../utils/guestOrderAccess'
import { clearGuestCheckout } from '../../utils/guestCheckout'
import { validateCheckoutForm } from './checkoutValidation'
import {
  CHECKOUT_DRAFT_STORAGE_KEY,
  CHECKOUT_KEY_STORAGE_KEY,
  GUEST_ACCESS_TOKEN_STORAGE_KEY,
  clearSessionValue,
} from './checkoutSession'
import type { CartItem } from '../../context/cartContext'
import type { CheckoutFormData, CheckoutStep } from './types'

interface UseCheckoutOrderDeps {
  items: CartItem[]
  canCheckout: boolean
  isCartLoading: boolean
  refreshCart: () => Promise<void>
  form: CheckoutFormData
  resolvedZone: ResolvedDeliveryZone | null
  isZoneResolving: boolean
  paymentSettings: PaymentSettings | null
  paymentError: string | null
  checkoutKey: string
  guestAccessToken: string
  user: AuthenticatedUser | null
  guestCheckout: boolean
  openAuth: () => void
  onInvalidStep: (step: CheckoutStep) => void
}

export function useCheckoutOrder({
  items,
  canCheckout,
  isCartLoading,
  refreshCart,
  form,
  resolvedZone,
  isZoneResolving,
  paymentSettings,
  paymentError,
  checkoutKey,
  guestAccessToken,
  user,
  guestCheckout,
  openAuth,
  onInvalidStep,
}: UseCheckoutOrderDeps) {
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [needsCartReview, setNeedsCartReview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const clearSubmissionState = () => {
    setSubmitError(null)
    setNeedsCartReview(false)
  }

  const placeOrder = async () => {
    const nextErrors = validateCheckoutForm(form)
    setSubmitError(null)
    setNeedsCartReview(false)

    // Guard against an invalid state reached via the persisted draft (e.g. a
    // stale sessionStorage value). Send the customer back to the offending
    // step so the validation messages are visible.
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.fullName || nextErrors.phone || nextErrors.email) onInvalidStep('contact')
      else if (nextErrors.fulfillmentMethod || nextErrors.address || nextErrors.state || nextErrors.city || nextErrors.areaId) onInvalidStep('delivery')
      else onInvalidStep('payment')
      return
    }

    if (items.length === 0 || isCartLoading || !canCheckout || !paymentSettings) {
      if (items.length === 0 || !canCheckout) {
        setSubmitError('One or more cart items need attention before checkout.')
        setNeedsCartReview(true)
      } else if (!paymentSettings) {
        setSubmitError(paymentError ?? 'Select an available payment method before placing your order.')
      }
      return
    }

    if (form.fulfillmentMethod === 'DELIVERY' && (!resolvedZone || isZoneResolving)) {
      setSubmitError(isZoneResolving
        ? 'Confirming your delivery zone, please wait.'
        : 'Delivery is not available for your selected city.')
      return
    }

    if (!user && !guestCheckout) {
      openAuth()
      return
    }

    setIsSubmitting(true)
    try {
      const order = await checkoutCustomerCart({
        checkoutKey,
        ...(user
          ? {}
          : {
              guestAccessToken,
              cartItems: items.map((item) => ({
                productId: item.id,
                productOptionId: item.productOptionId ?? null,
                quantity: item.quantity,
              })),
            }),
        customerName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        fulfillmentMethod: form.fulfillmentMethod as FulfillmentMethod,
        ...(form.fulfillmentMethod === 'DELIVERY'
          ? {
              deliveryAddress: form.address.trim(),
              city: form.city.trim(),
              stateId: form.state || undefined,
              cityId: form.cityId || undefined,
              areaId: form.areaId || undefined,
              deliveryInstructions: form.deliveryInstructions.trim() || undefined,
            }
          : {}),
        paymentMethod: form.paymentMethod,
      })

      // Keep the guest access token available for the Paystack return page and
      // for the confirmation page, which both load the order themselves.
      if (!user) {
        saveGuestOrderAccessToken(order.orderNumber, guestAccessToken)
      }

      if (form.paymentMethod === 'PAYSTACK') {
        const callbackUrl = `${window.location.origin}/order-confirmation/${encodeURIComponent(order.orderNumber)}${user ? '' : `?access=${encodeURIComponent(guestAccessToken)}`}`
        const payment = user
          ? await initializePaystackPayment({ orderId: order.id, callbackUrl })
          : await initializeGuestPaystackPayment({ orderId: order.id, guestAccessToken, callbackUrl })

        // Leave straight for Paystack. We do NOT refresh the cart here: doing so
        // would momentarily swap this page out for the skeleton loader and jump
        // the scroll position. The cart re-hydrates on return from Paystack.
        clearSessionValue(CHECKOUT_DRAFT_STORAGE_KEY)
        clearSessionValue(CHECKOUT_KEY_STORAGE_KEY)
        clearSessionValue(GUEST_ACCESS_TOKEN_STORAGE_KEY)
        clearGuestCheckout()
        window.location.assign(payment.authorizationUrl)
        return
      }

      // The API removes only the purchased cart rows. Refreshing keeps the
      // cart badge correct without clearing items added in another tab.
      await refreshCart()
      clearSessionValue(CHECKOUT_DRAFT_STORAGE_KEY)
      clearSessionValue(CHECKOUT_KEY_STORAGE_KEY)
      clearSessionValue(GUEST_ACCESS_TOKEN_STORAGE_KEY)
      clearGuestCheckout()
      navigate(`/order-confirmation/${encodeURIComponent(order.orderNumber)}${user ? '' : `?access=${encodeURIComponent(guestAccessToken)}`}`, { replace: true })
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'We couldn’t submit your order. Please try again.'
      setSubmitError(message)
      if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
        setNeedsCartReview(true)
        void refreshCart().catch(() => {
          // Keep the API validation message visible if the refresh also fails.
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    placeOrder,
    submitError,
    needsCartReview,
    isSubmitting,
    clearSubmissionState,
  }
}