import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BagIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { useCart } from '../hooks/useCart'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { ApiError } from '../services/api'
import { checkoutCustomerCart, type PaymentMethod } from '../services/orderService'
import { getPublicStoreSettings, type PaymentSettings } from '../services/storeSettingsService'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price)

interface CheckoutFormData {
  fullName: string
  phone: string
  email: string
  address: string
  city: string
  deliveryInstructions: string
  paymentMethod: PaymentMethod
}

type CheckoutField = keyof CheckoutFormData
type FormErrors = Partial<Record<CheckoutField, string>>

const initialForm: CheckoutFormData = {
  fullName: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  deliveryInstructions: '',
  paymentMethod: 'BANK_TRANSFER',
}

const inputClassName = (hasError: boolean) =>
  `mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-green focus:ring-2 focus:ring-green/10 ${
    hasError ? 'border-orange' : 'border-line'
  }`

function validateForm(form: CheckoutFormData): FormErrors {
  const errors: FormErrors = {}

  if (!form.fullName.trim()) errors.fullName = 'Please enter your full name.'
  if (!form.phone.trim()) {
    errors.phone = 'Please enter your phone number.'
  } else if (form.phone.replace(/\D/g, '').length < 7) {
    errors.phone = 'Please enter a valid phone number.'
  }
  if (!form.address.trim()) errors.address = 'Please enter your delivery address.'
  if (!form.city.trim()) errors.city = 'Please enter your city or location.'

  return errors
}

function FieldError({ id, message }: { id: CheckoutField; message?: string }) {
  return message ? (
    <p className="mt-1.5 text-xs font-medium text-orange" id={`${id}-error`} role="alert">
      {message}
    </p>
  ) : null
}

function EmptyCheckout() {
  return (
    <section className="container flex min-h-[calc(100vh-68px)] items-center justify-center py-16 md:min-h-[calc(100vh-78px)]">
      <div className="w-full max-w-xl rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm sm:px-10">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-sage text-green">
          <BagIcon size={28} />
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
    </section>
  )
}

export function Checkout() {
  const {
    items,
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
  const [form, setForm] = useState<CheckoutFormData>(initialForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [needsCartReview, setNeedsCartReview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentSettings[]>([])
  const [isPaymentLoading, setIsPaymentLoading] = useState(true)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [checkoutKey] = useState(() => crypto.randomUUID())

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
    const nextErrors = validateForm(form)
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

    setIsSubmitting(true)
    try {
      const order = await checkoutCustomerCart({
        checkoutKey,
        customerName: form.fullName.trim(),
        phone: form.phone.trim(),
        deliveryAddress: form.address.trim(),
        city: form.city.trim(),
        deliveryInstructions: form.deliveryInstructions.trim() || undefined,
        paymentMethod: form.paymentMethod,
      })

      // The API removes only the purchased cart rows. Refreshing keeps the
      // cart badge correct without clearing items added in another tab.
      await refreshCart()
      navigate(`/order-confirmation/${encodeURIComponent(order.orderNumber)}`, { replace: true })
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

  if (!isCustomerAuthLoading && !user) {
    return (
      <>
        <Navbar />
        <main>
          <section className="container flex min-h-[calc(100vh-68px)] items-center justify-center py-16 md:min-h-[calc(100vh-78px)]">
            <div className="w-full max-w-xl rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm sm:px-10">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-sage text-green">
                <span className="text-2xl font-bold" aria-hidden="true">A</span>
              </div>
              <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Customer account required</p>
              <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-green-dark sm:text-5xl">Sign in to check out</h1>
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
                Your cart and orders are securely tied to your customer account.
              </p>
              <button
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
                type="button"
                onClick={() => openAuth()}
              >
                Sign in or create an account <ArrowRight size={16} />
              </button>
            </div>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  if (isCustomerAuthLoading || isCartLoading) {
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
          <div className="container py-10 sm:py-14">
            <Breadcrumb
              className="mb-7"
              items={[
                { label: 'Home', href: '/' },
                { label: 'Cart', href: '/cart' },
                { label: 'Checkout' },
              ]}
            />
            <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
              <span className="inline-block size-2 rounded-full bg-orange" />
              Almost there
            </p>
            <h1 className="m-0 text-5xl font-bold tracking-[-0.05em] text-green-dark sm:text-6xl">Checkout</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted">
              Confirm your delivery details and place your order securely.
            </p>
          </div>
        </section>

        <section className="container py-12 sm:py-16 lg:py-24">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
            <form className="space-y-8" onSubmit={handleSubmit} noValidate>
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

              <fieldset className="m-0 border-0 p-0">
                <legend className="text-2xl font-bold tracking-[-0.03em] text-green-dark">Delivery information</legend>
                <p className="mt-2 text-sm leading-6 text-muted">These details are saved with this order as a delivery snapshot.</p>

                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-bold text-green-dark" htmlFor="fullName">
                      Full name <span className="text-orange" aria-hidden="true">*</span>
                    </label>
                    <input className={inputClassName(Boolean(errors.fullName))} id="fullName" name="fullName" type="text" autoComplete="name" value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'fullName-error' : undefined} required />
                    <FieldError id="fullName" message={errors.fullName} />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-green-dark" htmlFor="phone">
                      Phone number <span className="text-orange" aria-hidden="true">*</span>
                    </label>
                    <input className={inputClassName(Boolean(errors.phone))} id="phone" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'phone-error' : undefined} required />
                    <FieldError id="phone" message={errors.phone} />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-green-dark" htmlFor="email">Account email</label>
                    <input className={inputClassName(false)} id="email" name="email" type="email" readOnly value={form.email} aria-describedby="email-help" />
                    <p className="mt-1.5 text-xs text-muted" id="email-help">This is the email on your customer account.</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-bold text-green-dark" htmlFor="address">
                      Delivery address <span className="text-orange" aria-hidden="true">*</span>
                    </label>
                    <textarea className={`${inputClassName(Boolean(errors.address))} min-h-28 resize-y`} id="address" name="address" autoComplete="street-address" placeholder="House number, street name, landmark" value={form.address} onChange={(event) => updateField('address', event.target.value)} aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? 'address-error' : undefined} required />
                    <FieldError id="address" message={errors.address} />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-bold text-green-dark" htmlFor="city">
                      City or location <span className="text-orange" aria-hidden="true">*</span>
                    </label>
                    <input className={inputClassName(Boolean(errors.city))} id="city" name="city" type="text" autoComplete="address-level2" placeholder="e.g. Ibadan" value={form.city} onChange={(event) => updateField('city', event.target.value)} aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? 'city-error' : undefined} required />
                    <FieldError id="city" message={errors.city} />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-bold text-green-dark" htmlFor="deliveryInstructions">
                      Delivery instructions <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <textarea className={`${inputClassName(false)} min-h-24 resize-y`} id="deliveryInstructions" name="deliveryInstructions" placeholder="Landmark, preferred delivery time, or other helpful details" value={form.deliveryInstructions} onChange={(event) => updateField('deliveryInstructions', event.target.value)} />
                  </div>
                </div>
              </fieldset>

               <fieldset className="m-0 border-0 border-t border-line p-0 pt-8">
                 <legend className="text-2xl font-bold tracking-[-0.03em] text-green-dark">Payment method</legend>
                 <p className="mt-2 text-sm leading-6 text-muted">Choose how you will pay. Your payment will remain pending until the store confirms it.</p>
                 {isPaymentLoading ? (
                   <div className="mt-5 rounded-2xl border border-line bg-cream/60 p-4 text-sm text-muted">Loading available payment methods…</div>
                 ) : paymentError ? (
                   <div className="mt-5 rounded-2xl border border-orange/30 bg-orange/5 p-4 text-sm leading-6 text-orange" role="alert">{paymentError}</div>
                 ) : paymentMethods.length === 0 ? (
                   <div className="mt-5 rounded-2xl border border-orange/30 bg-orange/5 p-4 text-sm leading-6 text-orange" role="alert">No payment methods are currently available. Please contact the store.</div>
                 ) : (
                   <div className="mt-5 space-y-3">
                     {paymentMethods.map((method) => (
                       <label
                         className={`block cursor-pointer rounded-2xl border p-4 transition-colors ${
                           form.paymentMethod === method.paymentMethod
                             ? 'border-green bg-sage/30'
                             : 'border-line bg-white hover:border-green/40'
                         }`}
                         key={method.paymentMethod}
                       >
                         <span className="flex items-start gap-3">
                           <input
                             className="mt-1 size-4 accent-green"
                             type="radio"
                             name="paymentMethod"
                             value={method.paymentMethod}
                             checked={form.paymentMethod === method.paymentMethod}
                             onChange={() => updateField('paymentMethod', method.paymentMethod)}
                           />
                           <span>
                             <span className="block text-sm font-bold text-green-dark">{method.paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' : method.paymentMethod}</span>
                             <span className="mt-1 block text-xs leading-5 text-muted">Transfer the order total using the account details below.</span>
                           </span>
                         </span>
                       </label>
                     ))}
                   </div>
                 )}
                 {paymentSettings?.paymentMethod === 'BANK_TRANSFER' && (
                   <div className="mt-4 rounded-2xl border border-green/20 bg-sage/20 p-4">
                     <p className="text-sm font-bold text-green-dark">Bank transfer instructions</p>
                     <dl className="mt-3 space-y-2 text-sm">
                       <div className="flex justify-between gap-4"><dt className="text-muted">Bank</dt><dd className="text-right font-bold text-green-dark">{paymentSettings.bankName}</dd></div>
                       <div className="flex justify-between gap-4"><dt className="text-muted">Account name</dt><dd className="text-right font-bold text-green-dark">{paymentSettings.accountName}</dd></div>
                       <div className="flex justify-between gap-4"><dt className="text-muted">Account number</dt><dd className="text-right font-bold text-green-dark">{paymentSettings.accountNumber}</dd></div>
                     </dl>
                     <p className="mt-3 whitespace-pre-line text-xs leading-5 text-muted">{paymentSettings.instructions}</p>
                   </div>
                 )}
               </fieldset>

              <div className="mt-5">
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green py-4 text-sm font-bold text-cream shadow-lg shadow-green/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-dark focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  type="submit"
                   disabled={isSubmitting || !canCheckout || isPaymentLoading || !paymentSettings}
                >
                  {isSubmitting ? 'Processing order…' : 'Place order'} {!isSubmitting && <ArrowRight size={17} />}
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
              <div className="flex items-center justify-between gap-4">
                <h2 id="checkout-summary-heading" className="m-0 text-2xl font-bold tracking-[-0.03em] text-green-dark">Your order</h2>
                <Link className="text-xs font-bold text-green transition-colors hover:text-orange" to="/cart">Edit cart</Link>
              </div>
              <div className="mt-6 space-y-5">
                {items.map((item) => (
                  <div className="flex gap-3" key={item.id}>
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
                      <p className="mt-1 text-xs text-muted">{item.unit} · {formatPrice(item.price)} each</p>
                    </div>
                    <strong className="text-sm text-green-dark">{formatPrice(getItemSubtotal(item))}</strong>
                  </div>
                ))}
              </div>
              <div className="my-6 space-y-3 border-y border-line py-5 text-sm">
                <div className="flex justify-between gap-4 text-muted"><span>Items</span><span>{totalQuantity}</span></div>
                <div className="flex justify-between gap-4 text-muted"><span>Subtotal</span><span className="font-bold text-green-dark">{formatPrice(subtotal)}</span></div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold text-green-dark">Total</span>
                <strong className="text-2xl text-green-dark">{formatPrice(subtotal)}</strong>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}