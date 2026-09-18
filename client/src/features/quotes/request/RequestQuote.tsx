import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Footer } from '../../../components/layout/Footer'
import { Navbar } from '../../../components/layout/Navbar'
import { Breadcrumb } from '../../../components/ui/Breadcrumb'
import { useCustomerAuth } from '../../../hooks/useCustomerAuth'
import { useProductSearchAutocomplete } from '../../../hooks/useProductSearchAutocomplete'
import { useInitialRouteLoad } from '../../../hooks/useInitialRouteLoad'
import { ApiError } from '../../../services/api'
import { getProduct } from '../../../services/productService'
import { createQuoteRequest, type QuoteRequest } from '../../../services/quoteService'
import type { Product } from '../../../types/product'
import { scrollToTopInstant } from '../../../utils/browserCompatibility'
import { Seo } from '../../../seo/Seo'
import {
  countRequestedUnits,
  emptyDeliveryDraft,
  initialOptionFor,
  makeRequestKey,
  MAX_LINES,
  newQuoteLine,
  productAlreadyAdded,
  readQuantityParam,
  sortedOptions,
  validateQuoteForm,
  type DeliveryDraft,
  type FieldErrors,
  type QuoteFulfillmentMethod,
  type QuoteLine,
} from './lib'
import { QuoteLineCard } from './QuoteLineCard'
import { QuoteProductPicker } from './QuoteProductPicker'
import { RequestQuoteCustomerFields } from './RequestQuoteCustomerFields'
import { RequestQuoteFulfillment } from './RequestQuoteFulfillment'
import { RequestQuoteSuccessCard } from './RequestQuoteSuccessCard'

export function RequestQuote() {
  const [searchParams] = useSearchParams()
  const preselectedProductId = searchParams.get('product')
  const preselectedOptionId = searchParams.get('option')
  const preselectedQuantity = readQuantityParam(searchParams.get('qty'))
  const requestKeyRef = useRef<string>(makeRequestKey())

  const { user } = useCustomerAuth()
  const isWholesaleShopper = user?.role === 'CUSTOMER' && user.shoppingMode === 'WHOLESALE'
  const isLoggedInCustomer = user?.role === 'CUSTOMER'

  const [lines, setLines] = useState<QuoteLine[]>([])
  const preselectHandledRef = useRef(false)
  const [customerName, setCustomerName] = useState(user?.name ?? '')
  const [customerEmail, setCustomerEmail] = useState(user?.email ?? '')
  const [customerPhone, setCustomerPhone] = useState(user?.phone ?? '')
  const [message, setMessage] = useState('')
  const [fulfillmentMethod, setFulfillmentMethod] = useState<QuoteFulfillmentMethod>('')
  const [delivery, setDelivery] = useState<DeliveryDraft>(emptyDeliveryDraft)
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerError, setPickerError] = useState<string | null>(null)

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isLoadingPreselect, setIsLoadingPreselect] = useState(Boolean(preselectedProductId))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submittedRequest, setSubmittedRequest] = useState<QuoteRequest | null>(null)

  useInitialRouteLoad(!isLoadingPreselect)

  const picker = useProductSearchAutocomplete(pickerSearch)

  useEffect(() => {
    if (!user) return
    queueMicrotask(() => {
      setCustomerName((current) => current || user.name)
      setCustomerEmail((current) => current || user.email)
      setCustomerPhone((current) => current || (user.phone ?? ''))
    })
  }, [user])

  useEffect(() => {
    if (!preselectedProductId || preselectHandledRef.current) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setIsLoadingPreselect(true)
    })
    getProduct(preselectedProductId)
      .then((product) => {
        if (cancelled) return
        preselectHandledRef.current = true
        const options = sortedOptions(product)
        const optionId = options.length > 0
          ? initialOptionFor(product, preselectedOptionId)
          : null
        setLines([newQuoteLine(product, optionId, String(preselectedQuantity))])
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setPickerError(error instanceof ApiError && error.status === 404
          ? 'This product is no longer available for quote requests.'
          : 'The product could not be loaded.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPreselect(false)
      })
    return () => {
      cancelled = true
    }
  }, [preselectedOptionId, preselectedProductId, preselectedQuantity])

  const clearSubmitError = () => setSubmitError(null)

  const updateLine = (uid: string, updates: Partial<QuoteLine>) => {
    setLines((current) => current.map((line) => (line.uid === uid ? { ...line, ...updates } : line)))
    setSubmitError(null)
    setFieldErrors((current) => {
      const next = { ...current }
      delete next[`line-${uid}-quantity`]
      delete next[`line-${uid}-option`]
      delete next[`line-${uid}-note`]
      return next
    })
  }

  const removeLine = (uid: string) => {
    setLines((current) => current.filter((line) => line.uid !== uid))
    setSubmitError(null)
  }

  const addProductLine = (product: Product) => {
    setLines((current) => {
      if (current.some((line) => line.product?.id === product.id) || current.length >= MAX_LINES) {
        return current
      }
      return [...current, newQuoteLine(product, initialOptionFor(product, null), '1')]
    })
    setPickerSearch('')
    setPickerError(null)
    setSubmitError(null)
  }

  const clearFieldError = (field: string) => {
    setFieldErrors((current) => ({ ...current, [field]: '' }))
  }

  const changeFulfillmentMethod = (next: QuoteFulfillmentMethod) => {
    setFulfillmentMethod(next)
    clearFieldError('fulfillmentMethod')
    setSubmitError(null)
  }

  const updateDelivery = (patch: Partial<DeliveryDraft>) => {
    setDelivery((current) => ({ ...current, ...patch }))
    setSubmitError(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    const nextErrors = validateQuoteForm({
      customerName,
      customerEmail,
      customerPhone,
      message,
      lines,
      fulfillmentMethod,
      delivery,
    })
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setSubmitError('Please fix the highlighted fields and try again.')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const isDelivery = fulfillmentMethod === 'DELIVERY'
      const { quoteRequest, created } = await createQuoteRequest({
        requestKey: requestKeyRef.current,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerPhone: customerPhone.trim(),
        message: message.trim() || undefined,
        fulfillmentMethod: fulfillmentMethod || undefined,
        ...(isDelivery
          ? {
              stateId: delivery.stateId,
              cityId: delivery.cityId,
              city: delivery.city.trim(),
              areaId: delivery.areaId || undefined,
              deliveryAddress: delivery.address.trim(),
            }
          : {}),
        items: lines.map((line) => ({
          productId: line.product!.id,
          productOptionId: line.optionId,
          quantity: Number(line.quantity),
          note: line.note.trim() || undefined,
        })),
      })
      if (created) {
        setSubmittedRequest(quoteRequest)
        scrollToTopInstant()
      } else {
        // A concurrent duplicate was already received before this response
        // landed. The form contents are NOT stored — inform the user and
        // rotate the key so a corrected resubmission creates a fresh record.
        requestKeyRef.current = makeRequestKey()
        setSubmitError(
          `This quote request was already received as ${quoteRequest.quoteNumber} from an earlier submission. ` +
          'Your current form was NOT saved — submit again to create a new request.',
        )
      }
    } catch (error: unknown) {
      setSubmitError(error instanceof ApiError ? error.message : 'Your request could not be submitted right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const requestedUnits = countRequestedUnits(lines)

  return (
    <>
      <Seo
        title="Request a Quote | Ayanfe Food Variety"
        description="Need large quantities of foodstuff? Request a quote and our team will confirm pricing for your bulk or wholesale order."
        canonicalPath="/request-a-quote"
      />
      <Navbar />
      <main>
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-8 sm:py-10 lg:py-12">
            <Breadcrumb className="mb-6" items={[{ label: 'Home', href: '/' }, { label: 'Request a Quote' }]} />
            <div className="max-w-2xl">
              <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
                <span className="inline-block size-2 rounded-full bg-orange" />
                Bulk & wholesale enquiries
              </p>
              <h1 className="m-0 text-4xl font-bold leading-none tracking-[-0.05em] text-green-dark sm:text-5xl">
                Request a quote
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
                Tell us what you need and how much. We&rsquo;ll review your request and get back to you with pricing for larger quantities.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-14 sm:py-18 lg:py-24">
          <div className="mx-auto w-full max-w-3xl">
            {submittedRequest ? (
              <RequestQuoteSuccessCard
                quoteRequest={submittedRequest}
                firstName={user ? user.name.split(' ')[0] : undefined}
                canViewOrders={user?.role === 'CUSTOMER'}
              />
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <RequestQuoteCustomerFields
                  customerName={customerName}
                  customerEmail={customerEmail}
                  customerPhone={customerPhone}
                  message={message}
                  errors={fieldErrors}
                  isLoggedInCustomer={isLoggedInCustomer}
                  onCustomerNameChange={(value) => {
                    setCustomerName(value)
                    clearFieldError('name')
                    clearSubmitError()
                  }}
                  onCustomerEmailChange={(value) => {
                    setCustomerEmail(value)
                    clearFieldError('email')
                    clearSubmitError()
                  }}
                  onCustomerPhoneChange={(value) => {
                    setCustomerPhone(value)
                    clearFieldError('phone')
                    clearSubmitError()
                  }}
                  onMessageChange={(value) => {
                    setMessage(value)
                    clearFieldError('message')
                    clearSubmitError()
                  }}
                />

                <section className="mt-6 rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-8" aria-labelledby="products-heading">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 id="products-heading" className="text-xl font-bold text-green-dark">Requested products</h2>
                      <p className="mt-1 text-sm text-muted">Add one or more products and the quantity you need.</p>
                    </div>
                    {isWholesaleShopper && (
                      <span className="rounded-full bg-orange/10 px-3 py-1.5 text-xs font-bold text-orange" role="status">
                        Wholesale request
                      </span>
                    )}
                  </div>

                  {fieldErrors.items && (
                    <p className="mt-4 rounded-xl border border-orange/25 bg-orange/5 p-3 text-sm font-semibold text-orange" role="alert">
                      {fieldErrors.items}
                    </p>
                  )}

                  {lines.length > 0 && (
                    <ul className="mt-6 space-y-4" aria-label="Selected products">
                      {lines.map((line) => (
                        <QuoteLineCard key={line.uid} line={line} errors={fieldErrors} onUpdate={updateLine} onRemove={removeLine} />
                      ))}
                    </ul>
                  )}

                  <QuoteProductPicker
                    search={pickerSearch}
                    error={pickerError}
                    picker={picker}
                    disabled={lines.length >= MAX_LINES}
                    onSearchChange={(value) => {
                      setPickerSearch(value)
                      setPickerError(null)
                    }}
                    alreadyAdded={(product) => productAlreadyAdded(lines, product)}
                    onAdd={addProductLine}
                  />

                  {isLoadingPreselect ? (
                    <p className="mt-6 rounded-xl bg-sage/35 p-4 text-sm text-muted">Loading preselected product…</p>
                  ) : null}
                  {lines.length > 0 && (
                    <p className="mt-4 text-xs text-muted">
                      {lines.length} {lines.length === 1 ? 'product' : 'products'} · {requestedUnits} {requestedUnits === 1 ? 'unit' : 'units'} requested
                    </p>
                  )}
                </section>

                <RequestQuoteFulfillment
                  method={fulfillmentMethod}
                  delivery={delivery}
                  errors={fieldErrors}
                  onMethodChange={changeFulfillmentMethod}
                  onDeliveryChange={updateDelivery}
                  clearError={clearFieldError}
                />

                {submitError && (
                  <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">
                    {submitError}
                  </div>
                )}

                <div className="mt-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-muted">
                    Submitting creates a request only — no order is placed and no payment is taken.
                  </p>
                  <button
                    className="rounded-full bg-green px-8 py-3.5 text-sm font-bold text-cream shadow-lg shadow-green/15 transition-colors hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting…' : 'Submit quote request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}