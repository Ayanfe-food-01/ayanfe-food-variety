import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BagIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { useCart } from '../hooks/useCart'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { ApiError } from '../services/api'
import { checkoutCustomerCart, type CreatedOrder } from '../services/orderService'
import { getBankDetails, submitPaymentProof, type BankDetails, type PaymentSubmission } from '../services/paymentService'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price)

interface CheckoutFormData {
  fullName: string
  phone: string
  whatsapp: string
  email: string
  address: string
  city: string
  note: string
}

type CheckoutField = keyof CheckoutFormData
type FormErrors = Partial<Record<CheckoutField, string>>

const initialForm: CheckoutFormData = {
  fullName: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  city: '',
  note: '',
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
  if (form.whatsapp.trim() && form.whatsapp.replace(/\D/g, '').length < 7) {
    errors.whatsapp = 'Please enter a valid WhatsApp number.'
  }
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email address.'
  }
  if (!form.address.trim()) errors.address = 'Please enter your delivery address.'
  if (!form.city.trim()) errors.city = 'Please enter your city or location.'

  return errors
}

interface FieldErrorProps {
  id: CheckoutField
  message?: string
}

function FieldError({ id, message }: FieldErrorProps) {
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

function OrderConfirmation({ order }: { order: CreatedOrder }) {
  const [bank, setBank] = useState<BankDetails | null>(null)
  const [bankError, setBankError] = useState<string | null>(null)
  const [senderName, setSenderName] = useState(order.customerName)
  const [transactionReference, setTransactionReference] = useState('')
  const [amount, setAmount] = useState(order.total)
  const [transferredAt, setTransferredAt] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  const [proofError, setProofError] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [payment, setPayment] = useState<PaymentSubmission | null>(null)

  useEffect(() => {
    getBankDetails()
      .then(setBank)
      .catch((error: unknown) => {
        setBankError(error instanceof ApiError ? error.message : 'Bank details could not be loaded.')
      })
  }, [])

  const handleProofChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null
    setProofError(null)
    setPaymentError(null)
    if (!selectedFile) {
      setProof(null)
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
      setProof(null)
      setProofError('Please select a JPG, PNG, or WEBP image.')
      return
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setProof(null)
      setProofError('Receipt images must be 5 MB or smaller.')
      return
    }
    setProof(selectedFile)
  }

  const handlePaymentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPaymentError(null)
    if (!proof) {
      setProofError('A payment receipt is required.')
      return
    }
    if (!senderName.trim() || !transactionReference.trim() || !transferredAt) {
      setPaymentError('Please complete all payment details.')
      return
    }

    setIsSubmittingPayment(true)
    try {
      const submission = await submitPaymentProof({
        orderId: order.id,
        senderName: senderName.trim(),
        transactionReference: transactionReference.trim(),
        amount,
        transferredAt,
        proof,
      })
      setPayment(submission)
    } catch (error) {
      setPaymentError(error instanceof ApiError ? error.message : 'We couldn’t submit your payment proof. Please try again.')
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  return (
    <section className="container flex min-h-[calc(100vh-68px)] items-center justify-center py-16 md:min-h-[calc(100vh-78px)]">
      <div className="w-full max-w-2xl rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm sm:px-10">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-sage text-green">
          <span className="text-2xl font-bold" aria-hidden="true">✓</span>
        </div>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Order received</p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-green-dark sm:text-5xl">
          Thank you for your order
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted">
          Your order has been created. Transfer the exact amount below, then submit your receipt for review.
        </p>

        <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
          <div className="rounded-2xl bg-sage/40 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange">Order number</p>
            <p className="mt-2 break-all text-sm font-bold text-green-dark">{order.orderNumber}</p>
          </div>
          <div className="rounded-2xl bg-sage/40 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange">Order total</p>
            <p className="mt-2 text-lg font-bold text-green-dark">{formatPrice(Number(order.total))}</p>
          </div>
          <div className="rounded-2xl bg-sage/40 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange">Customer</p>
            <p className="mt-2 text-sm font-bold text-green-dark">{order.customerName}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{order.phone}</p>
          </div>
          <div className="rounded-2xl bg-sage/40 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange">Delivering to</p>
            <p className="mt-2 text-sm font-bold text-green-dark">{order.city}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{order.deliveryAddress}</p>
          </div>
          <div className="rounded-2xl bg-sage/40 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange">Payment status</p>
            <p className="mt-2 text-sm font-bold text-green-dark">{payment ? 'Awaiting verification' : 'Payment pending'}</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              {payment ? 'Your receipt is being reviewed.' : 'Payment is not confirmed yet.'}
            </p>
          </div>
        </div>

        {payment ? (
          <div className="mt-8 rounded-2xl border border-green/25 bg-sage/25 p-5 text-left">
            <p className="text-sm font-bold text-green-dark">Payment submitted successfully.</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Your payment is currently awaiting verification. Your order will only be confirmed after payment has been verified.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 rounded-2xl border border-line bg-cream/60 p-5 text-left">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange">Bank transfer payment</p>
              {bank ? (
                <>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div><dt className="text-muted">Bank name</dt><dd className="mt-1 font-bold text-green-dark">{bank.bankName}</dd></div>
                    <div><dt className="text-muted">Account name</dt><dd className="mt-1 font-bold text-green-dark">{bank.accountName}</dd></div>
                    <div><dt className="text-muted">Account number</dt><dd className="mt-1 font-bold text-green-dark">{bank.accountNumber}</dd></div>
                  </dl>
                  <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-muted">{bank.instructions}</p>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted">{bankError ?? 'Loading bank details…'}</p>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
                <span className="text-muted">Transfer exactly</span>
                <strong className="text-xl text-green-dark">{formatPrice(Number(order.total))}</strong>
              </div>
            </div>

              {bank ? (
              <form className="mt-6 space-y-4 text-left" onSubmit={handlePaymentSubmit}>
              <h2 className="text-xl font-bold text-green-dark">I have made the transfer</h2>
              <label className="block text-sm font-bold text-green-dark">
                Sender name
                <input className={inputClassName(false)} value={senderName} onChange={(event) => setSenderName(event.target.value)} />
              </label>
              <label className="block text-sm font-bold text-green-dark">
                Transaction reference
                <input className={inputClassName(false)} value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} required />
              </label>
              <label className="block text-sm font-bold text-green-dark">
                Amount transferred
                <input className={inputClassName(false)} type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
              </label>
              <label className="block text-sm font-bold text-green-dark">
                Transfer date and time
                <input className={inputClassName(false)} type="datetime-local" value={transferredAt} onChange={(event) => setTransferredAt(event.target.value)} required />
              </label>
              <label className="block text-sm font-bold text-green-dark">
                Payment receipt or screenshot <span className="text-orange">*</span>
                <input className={`${inputClassName(Boolean(proofError))} file:mr-3 file:border-0 file:bg-sage file:px-3 file:py-1 file:font-bold`} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProofChange} required />
                <span className="mt-1 block text-xs font-normal text-muted">JPG, PNG, or WEBP up to 5 MB.</span>
              </label>
              {(proofError || paymentError) && <p className="text-sm font-medium text-orange" role="alert">{proofError ?? paymentError}</p>}
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green py-3.5 text-sm font-bold text-cream transition-colors hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50"
                type="submit"
                disabled={!proof || isSubmittingPayment}
              >
                {isSubmittingPayment ? 'Submitting receipt…' : 'Submit payment proof'} {!isSubmittingPayment && <ArrowRight size={17} />}
              </button>
              <p className="text-center text-xs leading-5 text-muted">
                Your payment receipt will be reviewed. Your order will only be confirmed after payment has been verified.
              </p>
            </form>
              ) : (
                <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-5 text-left" role="alert">
                  <p className="text-sm font-bold text-orange">Payment details are not configured yet.</p>
                  <p className="mt-2 text-sm leading-6 text-muted">Please contact the store before transferring funds. Payment proof submission is unavailable until the store publishes valid bank details.</p>
                </div>
              )}
          </>
        )}

        <Link
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
          to="/shop"
        >
          Continue shopping <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  )
}

export function Checkout() {
  const { items, subtotal, totalQuantity, getItemSubtotal, clearCart } = useCart()
  const { user, isLoading: isCustomerAuthLoading, openAuth } = useCustomerAuth()
  const [form, setForm] = useState<CheckoutFormData>(initialForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null)

  useEffect(() => {
    if (!user) return
    setForm((currentForm) => ({
      ...currentForm,
      fullName: currentForm.fullName || user.name,
      email: user.email,
    }))
  }, [user])

  const updateField = (field: CheckoutField, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
    if (errors[field]) {
      setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }))
    }
    setSubmitError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateForm(form)
    setErrors(nextErrors)
    setSubmitError(null)
    if (Object.keys(nextErrors).length > 0 || items.length === 0) return

    setIsSubmitting(true)
    try {
      const order = await checkoutCustomerCart({
        customerName: form.fullName.trim(),
        phone: form.phone.trim(),
        deliveryAddress: form.address.trim(),
        city: form.city.trim(),
        note: form.note.trim() || undefined,
      })
      clearCart()
      setCreatedOrder(order)
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : 'We couldn’t submit your order. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (createdOrder) {
    return (
      <>
        <Navbar />
        <main>
          <OrderConfirmation order={createdOrder} />
        </main>
        <Footer />
      </>
    )
  }

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

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main>
          <EmptyCheckout />
        </main>
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
              Tell us where to deliver your order and we’ll take care of the next step.
            </p>
          </div>
        </section>

        <section className="container py-12 sm:py-16 lg:py-24">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
            <form className="space-y-8" onSubmit={handleSubmit} noValidate>
              <fieldset className="m-0 border-0 p-0">
                <legend className="text-2xl font-bold tracking-[-0.03em] text-green-dark">Delivery information</legend>
                <p className="mt-2 text-sm leading-6 text-muted">We’ll use these details to coordinate your delivery.</p>

                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-bold text-green-dark" htmlFor="fullName">
                      Full name <span className="text-orange" aria-hidden="true">*</span>
                    </label>
                    <input
                      className={inputClassName(Boolean(errors.fullName))}
                      id="fullName"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. Ayanfe Johnson"
                      value={form.fullName}
                      onChange={(event) => updateField('fullName', event.target.value)}
                      aria-invalid={Boolean(errors.fullName)}
                      aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                      required
                    />
                    <FieldError id="fullName" message={errors.fullName} />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-green-dark" htmlFor="phone">
                      Phone number <span className="text-orange" aria-hidden="true">*</span>
                    </label>
                    <input
                      className={inputClassName(Boolean(errors.phone))}
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="e.g. 0812 555 95879"
                      value={form.phone}
                      onChange={(event) => updateField('phone', event.target.value)}
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={errors.phone ? 'phone-error' : undefined}
                      required
                    />
                    <FieldError id="phone" message={errors.phone} />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-green-dark" htmlFor="whatsapp">
                      WhatsApp number <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <input
                      className={inputClassName(Boolean(errors.whatsapp))}
                      id="whatsapp"
                      name="whatsapp"
                      type="tel"
                      autoComplete="tel"
                      placeholder="If different from phone"
                      value={form.whatsapp}
                      onChange={(event) => updateField('whatsapp', event.target.value)}
                      aria-invalid={Boolean(errors.whatsapp)}
                      aria-describedby={errors.whatsapp ? 'whatsapp-error' : undefined}
                    />
                    <FieldError id="whatsapp" message={errors.whatsapp} />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-bold text-green-dark" htmlFor="email">
                      Account email
                    </label>
                    <input
                      className={inputClassName(Boolean(errors.email))}
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      readOnly
                      value={form.email}
                      aria-describedby="email-help"
                    />
                    <p className="mt-1.5 text-xs text-muted" id="email-help">This is the email on your customer account.</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-bold text-green-dark" htmlFor="address">
                      Delivery address <span className="text-orange" aria-hidden="true">*</span>
                    </label>
                    <textarea
                      className={`${inputClassName(Boolean(errors.address))} min-h-28 resize-y`}
                      id="address"
                      name="address"
                      autoComplete="street-address"
                      placeholder="House number, street name, landmark"
                      value={form.address}
                      onChange={(event) => updateField('address', event.target.value)}
                      aria-invalid={Boolean(errors.address)}
                      aria-describedby={errors.address ? 'address-error' : undefined}
                      required
                    />
                    <FieldError id="address" message={errors.address} />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-bold text-green-dark" htmlFor="city">
                      City or location <span className="text-orange" aria-hidden="true">*</span>
                    </label>
                    <input
                      className={inputClassName(Boolean(errors.city))}
                      id="city"
                      name="city"
                      type="text"
                      autoComplete="address-level2"
                      placeholder="e.g. Ibadan"
                      value={form.city}
                      onChange={(event) => updateField('city', event.target.value)}
                      aria-invalid={Boolean(errors.city)}
                      aria-describedby={errors.city ? 'city-error' : undefined}
                      required
                    />
                    <FieldError id="city" message={errors.city} />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-bold text-green-dark" htmlFor="note">
                      Additional order note <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <textarea
                      className={`${inputClassName(false)} min-h-24 resize-y`}
                      id="note"
                      name="note"
                      placeholder="Anything we should know about your delivery?"
                      value={form.note}
                      onChange={(event) => updateField('note', event.target.value)}
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="m-0 border-0 border-t border-line p-0 pt-8">
                <legend className="text-2xl font-bold tracking-[-0.03em] text-green-dark">Payment</legend>
                 <p className="mt-2 text-sm leading-6 text-muted">You’ll receive bank-transfer instructions after your order is created.</p>
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-green/25 bg-sage/25 p-4">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-4 border-green bg-cream" aria-hidden="true" />
                  <div>
                    <p className="m-0 text-sm font-bold text-green-dark">Manual bank transfer</p>
                    <p className="mt-1 text-xs leading-5 text-muted">Your order stays pending until a receipt is reviewed.</p>
                  </div>
                </div>
              </fieldset>

              <div className="mt-5">
                 <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green py-4 text-sm font-bold text-cream shadow-lg shadow-green/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-dark focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2"
                  type="submit"
                   disabled={isSubmitting}
                >
                    {isSubmitting ? 'Creating order…' : 'Create order & view bank details'} {!isSubmitting && <ArrowRight size={17} />}
                </button>
                 {submitError && (
                   <p className="mt-3 text-center text-sm font-medium text-orange" role="alert">
                     {submitError}
                   </p>
                )}
                <p className="mt-3 text-center text-xs text-muted">
                    Your cart will clear after the order is created; payment can be submitted and reviewed afterward.
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
                      <img className="size-16 rounded-xl object-cover" src={item.image} alt={item.name} />
                      <span className="absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full bg-orange px-1.5 py-0.5 text-[10px] font-bold text-cream">
                        {item.quantity}
                      </span>
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
                <div className="flex justify-between gap-4 text-muted">
                  <span>Items</span>
                  <span>{totalQuantity}</span>
                </div>
                <div className="flex justify-between gap-4 text-muted">
                  <span>Subtotal</span>
                  <span className="font-bold text-green-dark">{formatPrice(subtotal)}</span>
                </div>
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