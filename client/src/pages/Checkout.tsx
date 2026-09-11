import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { CheckoutEmpty, CheckoutLoading } from '../components/checkout/CheckoutStates'
import { CheckoutHeader } from '../components/checkout/CheckoutHeader'
import { CheckoutSummary } from '../components/checkout/CheckoutSummary'
import { ContactDetailsSection, PaymentMethodSection } from '../components/checkout/CheckoutFormSections'
import { DeliveryOptionsSection } from '../components/checkout/DeliveryOptionsSection'
import { calculateCheckoutTotals, deliveryFeeFromZone } from '../components/checkout/checkoutCalculations'
import { validateCheckoutForm } from '../components/checkout/checkoutValidation'
import { useCheckoutPaymentSettings } from '../components/checkout/useCheckoutPaymentSettings'
import { useDeliveryZoneResolution } from '../components/checkout/useDeliveryZoneResolution'
import { useGuestCheckout } from '../components/checkout/useGuestCheckout'
import {
  CHECKOUT_DRAFT_STORAGE_KEY,
  bootCheckoutKeys,
  clearCheckoutSession,
  readCheckoutDraft,
  writeSessionValue,
} from '../components/checkout/checkoutSession'
import type { CheckoutField, CheckoutFormData, CheckoutFormErrors } from '../components/checkout/types'
import { useCart } from '../hooks/useCart'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { useInitialRouteLoad } from '../hooks/useInitialRouteLoad'
import { ApiError } from '../services/api'
import { checkoutCustomerCart, type FulfillmentMethod } from '../services/orderService'
import { initializeGuestPaystackPayment, initializePaystackPayment } from '../services/paymentService'
import { clearGuestCheckout } from '../utils/guestCheckout'
import { saveGuestOrderAccessToken } from '../utils/guestOrderAccess'

export function Checkout() {
  const {
    items,
    mode,
    subtotal,
    totalQuantity,
    canCheckout,
    isLoading: isCartLoading,
    error: cartError,
    getItemSubtotal,
    refreshCart,
  } = useCart()
  const { user, isLoading: isCustomerAuthLoading, openAuth } = useCustomerAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<CheckoutFormData>(readCheckoutDraft)
  const [checkoutKeys] = useState(bootCheckoutKeys)
  const [errors, setErrors] = useState<CheckoutFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [needsCartReview, setNeedsCartReview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { paymentMethods, isPaymentLoading, paymentError } = useCheckoutPaymentSettings(setForm)
  const { resolvedZone, isZoneResolving, zoneError } = useDeliveryZoneResolution(form)
  const { guestCheckout } = useGuestCheckout(user)

  useInitialRouteLoad(!isCustomerAuthLoading && !(isCartLoading && !isSubmitting))

  useEffect(() => {
    writeSessionValue(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(form))
  }, [form])

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

  const updateField = (field: CheckoutField, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
    if (errors[field]) {
      setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }))
    }
    setSubmitError(null)
    setNeedsCartReview(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateCheckoutForm(form)
    setErrors(nextErrors)
    setSubmitError(null)
    setNeedsCartReview(false)

    if (Object.keys(nextErrors).length > 0 || items.length === 0 || isCartLoading || !canCheckout || !paymentSettings) {
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
        checkoutKey: checkoutKeys.checkoutKey,
        ...(user
          ? {}
          : {
              guestAccessToken: checkoutKeys.guestAccessToken,
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
        saveGuestOrderAccessToken(order.orderNumber, checkoutKeys.guestAccessToken)
      }

      if (form.paymentMethod === 'PAYSTACK') {
        const callbackUrl = `${window.location.origin}/order-confirmation/${encodeURIComponent(order.orderNumber)}${user ? '' : `?access=${encodeURIComponent(checkoutKeys.guestAccessToken)}`}`
        const payment = user
          ? await initializePaystackPayment({ orderId: order.id, callbackUrl })
          : await initializeGuestPaystackPayment({ orderId: order.id, guestAccessToken: checkoutKeys.guestAccessToken, callbackUrl })

        // Leave straight for Paystack. We do NOT refresh the cart here: doing so
        // flips the global cart loading flag, which would momentarily swap this
        // page out for the skeleton loader and jump the scroll position. The cart
        // is re-hydrated when the customer returns from Paystack.
        clearCheckoutSession()
        clearGuestCheckout()
        window.location.assign(payment.authorizationUrl)
        return
      }

      // The API removes only the purchased cart rows. Refreshing keeps the
      // cart badge correct without clearing items added in another tab.
      await refreshCart()
      clearCheckoutSession()
      clearGuestCheckout()
      navigate(`/order-confirmation/${encodeURIComponent(order.orderNumber)}${user ? '' : `?access=${encodeURIComponent(checkoutKeys.guestAccessToken)}`}`, { replace: true })
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

  const paymentSettings = paymentMethods.find((method) => method.paymentMethod === form.paymentMethod) ?? null
  const deliveryFee = deliveryFeeFromZone(resolvedZone, subtotal)
  const { deliveryFee: checkoutDeliveryFee, total: checkoutTotal } = calculateCheckoutTotals(
    subtotal,
    form.fulfillmentMethod,
    deliveryFee,
  )

  if (isCustomerAuthLoading || (isCartLoading && !isSubmitting)) {
    return (
      <>
        <Navbar />
        <main className="container py-16 sm:py-24" aria-label="Loading checkout">
          <CheckoutLoading />
        </main>
        <Footer />
      </>
    )
  }

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main><CheckoutEmpty /></main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main>
        <CheckoutHeader mode={mode} />

        <section className="container py-12 sm:py-16 lg:py-24">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
            <form className="min-w-0 space-y-0" onSubmit={handleSubmit} noValidate>
              {cartError && (
                <div className="rounded-2xl border border-orange/30 bg-orange/5 p-5 text-sm leading-6 text-orange" role="alert">
                  {cartError}
                </div>
              )}
              {needsCartReview && (
                <div className="rounded-2xl border border-orange/30 bg-orange/5 p-5 text-sm leading-6 text-orange" role="alert">
                  <p className="m-0 font-bold">Your cart needs attention before checkout.</p>
                  <p className="mt-1">{submitError ?? 'Refresh your cart and update unavailable items.'}</p>
                  <Link className="mt-3 inline-flex font-bold underline" to="/cart">Return to cart</Link>
                </div>
              )}

              <ContactDetailsSection form={form} errors={errors} isAuthenticated={Boolean(user)} onChange={updateField} />
              <PaymentMethodSection
                methods={paymentMethods}
                selectedMethod={form.paymentMethod}
                selectedSettings={paymentSettings}
                isLoading={isPaymentLoading}
                error={paymentError}
                onChange={(method) => updateField('paymentMethod', method)}
              />
              <DeliveryOptionsSection
                form={form}
                errors={errors}
                fulfillmentMethod={form.fulfillmentMethod}
                zone={resolvedZone}
                isZoneResolving={isZoneResolving}
                zoneError={zoneError}
                deliveryFee={deliveryFee}
                onChange={updateField}
              />

              <div className="mt-10">
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green py-4 text-sm font-bold text-cream shadow-lg shadow-green/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-dark focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  type="submit"
                  disabled={isSubmitting || !canCheckout || isPaymentLoading || !paymentSettings || !form.fulfillmentMethod}
                >
                  {isSubmitting ? 'Processing…' : 'Place order'} {!isSubmitting && <ArrowRight size={17} />}
                </button>
                {submitError && !needsCartReview && (
                  <p className="mt-3 text-center text-sm font-medium text-orange" role="alert">{submitError}</p>
                )}
              </div>
            </form>

            <CheckoutSummary
              items={items}
              mode={mode}
              subtotal={subtotal}
              totalQuantity={totalQuantity}
              getItemSubtotal={getItemSubtotal}
              fulfillmentMethod={form.fulfillmentMethod}
              isZoneResolving={isZoneResolving}
              resolvedZone={resolvedZone}
              deliveryFee={checkoutDeliveryFee}
              total={checkoutTotal}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}