import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, CartIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { ProductPrice } from '../components/products/ProductPrice'
import {
  ContactDetailsSection,
  PaymentMethodSection,
} from '../components/checkout/CheckoutFormSections'
import { DeliveryOptionsSection } from '../components/checkout/DeliveryOptionsSection'
import { calculateCheckoutTotals } from '../components/checkout/checkoutCalculations'
import { initialCheckoutForm, validateCheckoutForm } from '../components/checkout/checkoutValidation'
import type { CheckoutField, CheckoutFormData, CheckoutFormErrors } from '../components/checkout/types'
import { useCart } from '../hooks/useCart'
import { cartItemLineKey } from '../context/cartContext'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { useInitialRouteLoad } from '../hooks/useInitialRouteLoad'
import { ApiError } from '../services/api'
import { checkoutCustomerCart, getActiveDeliveryZones, type DeliveryZone, type FulfillmentMethod } from '../services/orderService'
import { getPublicStoreSettings, type PaymentSettings } from '../services/storeSettingsService'
import { initializeGuestPaystackPayment, initializePaystackPayment } from '../services/paymentService'
import { createRequestKey } from '../utils/browserCompatibility'
import { saveGuestOrderAccessToken } from '../utils/guestOrderAccess'
import { clearGuestCheckout, isGuestCheckoutMarked, markGuestCheckout } from '../utils/guestCheckout'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price)

const CHECKOUT_DRAFT_STORAGE_KEY = 'ayanfe-checkout-draft'
const CHECKOUT_KEY_STORAGE_KEY = 'ayanfe-checkout-key'
const GUEST_ACCESS_TOKEN_STORAGE_KEY = 'ayanfe-guest-access-token'

const readSessionValue = (key: string): string | null => {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

const writeSessionValue = (key: string, value: string): void => {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // Checkout remains usable for this tab if session storage is unavailable.
  }
}

const clearSessionValue = (key: string): void => {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // Nothing to clear when session storage is unavailable.
  }
}

const readCheckoutDraft = (): CheckoutFormData => {
  const stored = readSessionValue(CHECKOUT_DRAFT_STORAGE_KEY)
  if (!stored) return initialCheckoutForm
  try {
    const parsed = JSON.parse(stored) as Partial<CheckoutFormData>
    return { ...initialCheckoutForm, ...parsed }
  } catch {
    return initialCheckoutForm
  }
}

function EmptyCheckout() {
  return (
    <section className="container page-state-section flex items-center justify-center py-16">
      <div className="w-full max-w-xl">
        <Breadcrumb
          className="mb-8"
          items={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout' }]}
        />
        <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm sm:px-10">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-sage text-green">
          <CartIcon size={28} />
        </div>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Nothing to check out yet</p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-green-dark sm:text-5xl">Your cart is empty</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
          Add a few everyday essentials to your cart before continuing to delivery.
        </p>
        <Link
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
          to="/shop"
        >
          Continue shopping <ArrowRight size={16} />
        </Link>
        </div>
      </div>
    </section>
  )
}

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
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState<CheckoutFormData>(readCheckoutDraft)
  const [errors, setErrors] = useState<CheckoutFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [needsCartReview, setNeedsCartReview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentSettings[]>([])
  const [isPaymentLoading, setIsPaymentLoading] = useState(true)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([])
  const [checkoutKey] = useState(() => readSessionValue(CHECKOUT_KEY_STORAGE_KEY) ?? createRequestKey())
  const [guestAccessToken] = useState(() => readSessionValue(GUEST_ACCESS_TOKEN_STORAGE_KEY) ?? createRequestKey())

  useInitialRouteLoad(!isCustomerAuthLoading && !(isCartLoading && !isSubmitting))

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

  useEffect(() => {
    getActiveDeliveryZones()
      .then((zones) => {
        setDeliveryZones(zones)
        setForm((currentForm) => {
          if (currentForm.deliveryZoneId) return currentForm
          if (zones.length === 1) return { ...currentForm, deliveryZoneId: zones[0].id }
          return currentForm
        })
      })
      .catch(() => {
        // Delivery zones are optional for checkout; continue without them.
      })
  }, [])

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
              deliveryInstructions: form.deliveryInstructions.trim() || undefined,
              ...(form.deliveryZoneId ? { deliveryZoneId: form.deliveryZoneId } : {}),
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
        // flips the global cart loading flag, which would momentarily swap this
        // page out for the skeleton loader and jump the scroll position. The cart
        // is re-hydrated when the customer returns from Paystack.
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

  const paymentSettings = paymentMethods.find((method) => method.paymentMethod === form.paymentMethod) ?? null
  const selectedZone = form.deliveryZoneId ? deliveryZones.find((zone) => zone.id === form.deliveryZoneId) ?? null : null
  const selectedZoneFee = selectedZone
    ? (selectedZone.freeDeliveryThreshold !== null && subtotal >= Number(selectedZone.freeDeliveryThreshold)
        ? 0
        : Number(selectedZone.fee))
    : null
  const { deliveryFee: checkoutDeliveryFee, total: checkoutTotal } = calculateCheckoutTotals(
    subtotal,
    form.fulfillmentMethod,
    selectedZoneFee,
  )

  if (isCustomerAuthLoading || (isCartLoading && !isSubmitting)) {
    return (
      <>
        <Navbar />
        <main className="container py-16 sm:py-24" aria-label="Loading checkout">
          <div className="animate-pulse">
            <div className="h-12 w-48 rounded bg-sage" />
            <div className="mt-10 h-64 rounded-2xl bg-sage" />
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main><EmptyCheckout /></main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main>
        <section className="border-b border-line/70 bg-sage/35">
           <div className="container py-8 sm:py-10">
             <Breadcrumb
               className="mb-6"
               items={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout' }]}
             />
             <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
              <span className="inline-block size-2 rounded-full bg-orange" />
              Almost there
            </p>
             <h1 className="m-0 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Checkout</h1>
             <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Choose pickup or delivery, confirm your details, and place your order securely.
            </p>
             <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-green-dark">
               {mode === 'WHOLESALE' ? 'Wholesale Order' : 'Retail Order'}
             </p>
          </div>
        </section>

        <section className="container py-12 sm:py-16 lg:py-24">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
            <form className="space-y-0" onSubmit={handleSubmit} noValidate>
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
                deliveryZones={deliveryZones}
                subtotal={subtotal}
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
                <p className="mt-3 text-center text-xs text-muted">
                  Prices and totals are confirmed by the server when you place the order.
                </p>
              </div>
            </form>

            <aside className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8 lg:sticky lg:top-28" aria-labelledby="checkout-summary-heading">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]">
                <span className={mode === 'WHOLESALE' ? 'inline-block size-2 rounded-full bg-orange' : 'inline-block size-2 rounded-full bg-green'} />
                <span className={mode === 'WHOLESALE' ? 'text-orange' : 'text-green-dark'}>
                  {mode === 'WHOLESALE' ? 'Wholesale Order' : 'Retail Order'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <h2 id="checkout-summary-heading" className="m-0 text-2xl font-bold tracking-[-0.03em] text-green-dark">Your order</h2>
                <Link className="text-xs font-bold text-green transition-colors hover:text-orange" to="/cart">Edit cart</Link>
              </div>
              <div className="mt-6 space-y-5">
                {items.map((item) => (
                  <div className="flex gap-3" key={cartItemLineKey(item.id, item.productOptionId)}>
                    <div className="relative shrink-0">
                      {item.image ? (
                        <img className="size-16 rounded-xl object-cover" src={item.image} alt={item.name} />
                      ) : (
                        <div className="grid size-16 place-items-center rounded-xl bg-sage text-center text-[10px] text-muted">No image</div>
                      )}
                      <span className="absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full bg-orange px-1.5 py-0.5 text-[10px] font-bold text-cream">{item.quantity}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-sm font-bold text-green-dark">{item.name}</p>
                      {item.productOptionLabel && (
                        <p className="mt-0.5 text-xs font-semibold text-orange">{item.productOptionLabel}</p>
                      )}
                       <p className="mt-1 text-xs text-muted">
                         {item.unit} · <ProductPrice
                           originalPrice={item.originalPrice}
                           discountedPrice={item.price}
                           discountedClassName="font-bold text-green-dark"
                           originalClassName="ml-1 text-muted"
                         /> each
                       </p>
                    </div>
                    <strong className="text-sm text-green-dark">{formatPrice(getItemSubtotal(item))}</strong>
                  </div>
                ))}
              </div>
              <div className="my-6 space-y-3 border-y border-line py-5 text-sm">
                <div className="flex justify-between gap-4 text-muted"><span>Items</span><span>{totalQuantity}</span></div>
                <div className="flex justify-between gap-4 text-muted"><span>Subtotal</span><span className="font-bold text-green-dark">{formatPrice(subtotal)}</span></div>
                 <div className="flex justify-between gap-4 text-muted"><span>{form.fulfillmentMethod === 'PICKUP' ? 'Pickup fee' : 'Delivery fee'}</span><span className="font-bold text-green-dark">{checkoutDeliveryFee === null ? '—' : checkoutDeliveryFee === 0 ? 'FREE' : formatPrice(checkoutDeliveryFee)}</span></div>
              </div>
                <div className="mb-5 rounded-xl bg-sage/35 p-3 text-xs leading-5 text-muted">
                  <strong className="text-green-dark">{form.fulfillmentMethod === 'PICKUP' ? 'Pickup selected.' : form.fulfillmentMethod === 'DELIVERY' ? 'Delivery selected.' : 'Choose pickup or delivery.'}</strong>{' '}
                  {form.fulfillmentMethod === 'PICKUP' ? 'Your order total has no delivery fee. We will contact you using your phone number when it is ready for collection.' : form.fulfillmentMethod === 'DELIVERY' ? (selectedZone ? `Your delivery fee is based on the ${selectedZone.name} zone.` : deliveryZones.length > 0 ? 'Select a delivery zone to see your delivery fee.' : 'Delivery is unavailable until you select an active delivery zone.') : 'The final total will appear after you select a fulfillment option.'}
                </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold text-green-dark">Total</span>
                  <strong className="text-2xl text-green-dark">{formatPrice(checkoutTotal)}</strong>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}