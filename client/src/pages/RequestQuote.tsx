import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, CheckIcon, CloseIcon, SearchIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { SelectField } from '../components/ui/SelectField'
import { PhoneInputField } from '../components/ui/PhoneInput'
import { isValidE164PhoneNumber } from '../utils/phone'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { useProductSearchAutocomplete } from '../hooks/useProductSearchAutocomplete'
import { useInitialRouteLoad } from '../hooks/useInitialRouteLoad'
import { ApiError } from '../services/api'
import { getProduct } from '../services/productService'
import { createQuoteRequest, type QuoteRequest } from '../services/quoteService'
import type { Product } from '../types/product'
import { formatPrice } from '../utils/formatPrice'
import { scrollToTopInstant } from '../utils/browserCompatibility'
import { Seo } from '../seo/Seo'

const MAX_LINES = 50
const MAX_QUANTITY = 100000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const makeRequestKey = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `qk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

const validPhone = (value: string): boolean => isValidE164PhoneNumber(value)

const readQuantityParam = (value: string | null): number => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_QUANTITY ? parsed : 1
}

interface QuoteLine {
  uid: string
  product: Product | null
  optionId: string | null
  quantity: string
  note: string
}

const nextUid = (() => {
  let counter = 0
  return () => `ql-${Date.now().toString(36)}-${(counter += 1).toString(36)}`
})()

const sortedOptions = (product: Product): NonNullable<Product['options']> =>
  product.options?.length
    ? [...product.options].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
    : []

const initialOptionFor = (product: Product, preferredId: string | null): string | null => {
  const options = sortedOptions(product)
  if (options.length === 0) return null
  const preferred = options.find((option) => option.id === preferredId)
  if (preferred) return preferred.id
  return options.find((option) => option.stockQuantity > 0)?.id ?? options[0]?.id ?? null
}

export function RequestQuote() {
  const [searchParams] = useSearchParams()
  const preselectedProductId = searchParams.get('product')
  const preselectedOptionId = searchParams.get('option')
  const preselectedQuantity = readQuantityParam(searchParams.get('qty'))
  const requestKeyRef = useRef<string>(makeRequestKey())

  const { user } = useCustomerAuth()
  const isWholesaleShopper = user?.role === 'CUSTOMER' && user.shoppingMode === 'WHOLESALE'

  const [lines, setLines] = useState<QuoteLine[]>([])
  const [customerName, setCustomerName] = useState(user?.name ?? '')
  const [customerEmail, setCustomerEmail] = useState(user?.email ?? '')
  const [customerPhone, setCustomerPhone] = useState(user?.phone ?? '')
  const [message, setMessage] = useState('')
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerError, setPickerError] = useState<string | null>(null)

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
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
    if (!preselectedProductId || lines.length > 0) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setIsLoadingPreselect(true)
    })
    getProduct(preselectedProductId)
      .then((product) => {
        if (cancelled) return
        const options = sortedOptions(product)
        const optionId = options.length > 0
          ? initialOptionFor(product, preselectedOptionId)
          : null
        setLines([{
          uid: nextUid(),
          product,
          optionId,
          quantity: String(preselectedQuantity),
          note: '',
        }])
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
  }, [lines.length, preselectedOptionId, preselectedProductId, preselectedQuantity])

  const updateLine = (uid: string, updates: Partial<QuoteLine>) => {
    setLines((current) => current.map((line) => (line.uid === uid ? { ...line, ...updates } : line)))
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
  }

  const addProductLine = (product: Product) => {
    setLines((current) => {
      if (current.some((line) => line.product?.id === product.id) || current.length >= MAX_LINES) {
        return current
      }
      return [
        ...current,
        {
          uid: nextUid(),
          product,
          optionId: initialOptionFor(product, null),
          quantity: '1',
          note: '',
        },
      ]
    })
    setPickerSearch('')
    setPickerError(null)
  }

  const productAlreadyAdded = useCallback(
    (product: Product) => lines.some((line) => line.product?.id === product.id),
    [lines],
  )

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {}

    if (customerName.trim().length === 0) nextErrors.name = 'Enter your full name.'
    else if (customerName.trim().length > 180) nextErrors.name = 'Name must be 180 characters or fewer.'

    const email = customerEmail.trim().toLowerCase()
    if (email.length === 0) nextErrors.email = 'Enter your email address.'
    else if (!EMAIL_PATTERN.test(email)) nextErrors.email = 'Enter a valid email address.'

    if (customerPhone.trim().length === 0) nextErrors.phone = 'Enter your phone number.'
    else if (!validPhone(customerPhone)) nextErrors.phone = 'Enter a valid phone number.'

    if (message.length > 2000) nextErrors.message = 'Message must be 2,000 characters or fewer.'

    if (lines.length === 0) nextErrors.items = 'Add at least one product to your request.'

    lines.forEach((line) => {
      const quantity = Number(line.quantity)
      if (!line.quantity.trim() || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
        nextErrors[`line-${line.uid}-quantity`] = 'Quantity must be a whole number of at least 1.'
      }
      if ((line.product?.options?.length ?? 0) > 0 && !line.optionId) {
        nextErrors[`line-${line.uid}-option`] = 'Choose a quantity/size option for this product.'
      }
      if (line.note.length > 500) nextErrors[`line-${line.uid}-note`] = 'Item note must be 500 characters or fewer.'
    })

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return
    if (!validate()) {
      setSubmitError('Please fix the highlighted fields and try again.')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const created = await createQuoteRequest({
        requestKey: requestKeyRef.current,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerPhone: customerPhone.trim(),
        message: message.trim() || undefined,
        items: lines.map((line) => ({
          productId: line.product!.id,
          productOptionId: line.optionId,
          quantity: Number(line.quantity),
          note: line.note.trim() || undefined,
        })),
      })
      setSubmittedRequest(created)
      scrollToTopInstant()
    } catch (error: unknown) {
      setSubmitError(error instanceof ApiError ? error.message : 'Your request could not be submitted right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalUnits = lines.reduce((total, line) => {
    const quantity = Number(line.quantity)
    return total + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0)
  }, 0)

  const renderOption = (fieldErrors: Record<string, string>, line: QuoteLine, id: string) => {
    const options = sortedOptions(line.product!)
    if (options.length === 0) return null
    const selectOptions = options.map((option) => ({
      value: option.id,
      label: option.stockQuantity <= 0
        ? `${option.label} (Out of stock)`
        : `${option.label} — ${formatPrice(option.price)}`,
    }))
    const unavailableValues = options
      .filter((option) => option.stockQuantity <= 0)
      .map((option) => option.id)

    return (
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor={`${id}-option`}>
          Option / size
        </label>
        <SelectField
          id={`${id}-option`}
          className="w-full"
          disabledOptions={unavailableValues}
          options={selectOptions}
          value={line.optionId ?? ''}
          onChange={(value) => updateLine(line.uid, { optionId: value })}
          aria-invalid={Boolean(fieldErrors[`line-${line.uid}-option`])}
          aria-describedby={fieldErrors[`line-${line.uid}-option`] ? `${id}-option-error` : undefined}
        />
        {fieldErrors[`line-${line.uid}-option`] && (
          <p className="mt-2 text-xs font-semibold text-orange" id={`${id}-option-error`}>{fieldErrors[`line-${line.uid}-option`]}</p>
        )}
      </div>
    )
  }

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
              <section className="rounded-3xl border border-line bg-white px-6 py-12 text-center shadow-sm sm:px-12" aria-live="polite">
                <span className="mx-auto grid size-16 place-items-center rounded-full bg-green/10">
                  <CheckIcon className="text-green" size={32} />
                </span>
                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Quote request received</p>
                <h2 className="m-0 mt-2 text-3xl font-bold tracking-[-0.04em] text-green-dark sm:text-4xl">
                  Thank you{user ? `, ${user.name.split(' ')[0]}` : ''}!
                </h2>
                <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
                  Your quote request has been received. We&rsquo;ll review your request and get back to you.
                </p>
                <p className="mx-auto mt-4 max-w-md rounded-xl bg-sage/35 px-4 py-3 text-sm font-semibold text-green-dark">
                  Reference: {submittedRequest.quoteNumber}
                </p>
                <p className="mx-auto mt-4 max-w-md text-xs leading-5 text-muted">
                  Please keep the reference above for any follow-up. We aim to respond to quote requests promptly.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link className="inline-flex items-center gap-2 rounded-full bg-green px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark" to="/shop">
                    Continue shopping <ArrowRight size={16} />
                  </Link>
                  {user?.role === 'CUSTOMER' && (
                    <Link className="inline-flex items-center gap-2 rounded-full border border-green/20 px-6 py-3 text-sm font-bold text-green transition-colors hover:bg-green hover:text-cream" to="/orders">
                      View your orders
                    </Link>
                  )}
                </div>
              </section>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <section className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-8" aria-labelledby="customer-details-heading">
                  <h2 id="customer-details-heading" className="text-xl font-bold text-green-dark">Your details</h2>
                  <p className="mt-1 text-sm text-muted">
                    {user?.role === 'CUSTOMER'
                      ? 'We’ve filled in the details from your account. Feel free to update them.'
                      : 'No account needed — we’ll use these details to get back to you.'}
                  </p>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor="quote-name">
                        Full name
                      </label>
                      <input
                        autoComplete="name"
                        className={`w-full rounded-xl border bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10 ${fieldErrors.name ? 'border-orange/40' : 'border-line'}`}
                        id="quote-name"
                        value={customerName}
                        onChange={(event) => {
                          setCustomerName(event.target.value)
                          setFieldErrors((current) => ({ ...current, name: '' }))
                          setSubmitError(null)
                        }}
                        aria-invalid={Boolean(fieldErrors.name)}
                        aria-describedby={fieldErrors.name ? 'quote-name-error' : undefined}
                      />
                      {fieldErrors.name && <p className="mt-2 text-xs font-semibold text-orange" id="quote-name-error">{fieldErrors.name}</p>}
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor="quote-email">
                        Email address
                      </label>
                      <input
                        autoComplete="email"
                        className={`w-full rounded-xl border bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10 ${fieldErrors.email ? 'border-orange/40' : 'border-line'}`}
                        id="quote-email"
                        type="email"
                        value={customerEmail}
                        onChange={(event) => {
                          setCustomerEmail(event.target.value)
                          setFieldErrors((current) => ({ ...current, email: '' }))
                          setSubmitError(null)
                        }}
                        aria-invalid={Boolean(fieldErrors.email)}
                        aria-describedby={fieldErrors.email ? 'quote-email-error' : undefined}
                      />
                      {fieldErrors.email && <p className="mt-2 text-xs font-semibold text-orange" id="quote-email-error">{fieldErrors.email}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor="quote-phone">
                        Phone number
                      </label>
                      <PhoneInputField
                        id="quote-phone"
                        name="phone"
                        value={customerPhone}
                        hasError={Boolean(fieldErrors.phone)}
                        aria-describedby={fieldErrors.phone ? 'quote-phone-error' : undefined}
                        onChange={(value) => {
                          setCustomerPhone(value)
                          setFieldErrors((current) => ({ ...current, phone: '' }))
                          setSubmitError(null)
                        }}
                      />
                      {fieldErrors.phone && <p className="mt-2 text-xs font-semibold text-orange" id="quote-phone-error">{fieldErrors.phone}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor="quote-message">
                        Message / requirements <span className="font-normal normal-case tracking-normal text-muted">(optional)</span>
                      </label>
                      <textarea
                        className={`w-full resize-y rounded-xl border bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10 ${fieldErrors.message ? 'border-orange/40' : 'border-line'}`}
                        id="quote-message"
                        rows={4}
                        maxLength={2000}
                        placeholder="Delivery timeframe, packaging, other requirements…"
                        value={message}
                        onChange={(event) => {
                          setMessage(event.target.value)
                          setFieldErrors((current) => ({ ...current, message: '' }))
                        }}
                        aria-invalid={Boolean(fieldErrors.message)}
                        aria-describedby={fieldErrors.message ? 'quote-message-error' : undefined}
                      />
                      {fieldErrors.message && <p className="mt-2 text-xs font-semibold text-orange" id="quote-message-error">{fieldErrors.message}</p>}
                    </div>
                  </div>
                </section>

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
                      {lines.map((line) => {
                        const id = `line-${line.uid}`
                        return (
                          <li key={line.uid} className="rounded-2xl border border-line bg-cream/45 p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="break-words font-bold text-green-dark">{line.product?.name}</p>
                                {line.product && (
                                  <p className="mt-0.5 break-words text-xs text-muted">
                                    {formatPrice(line.product.options?.length ? line.product.price : line.product.discountedPrice)} · {line.product.category}
                                  </p>
                                )}
                              </div>
                              <button
                                className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white text-muted transition-colors hover:border-orange hover:text-orange"
                                type="button"
                                aria-label={`Remove ${line.product?.name ?? 'product'} from request`}
                                onClick={() => removeLine(line.uid)}
                              >
                                <CloseIcon size={16} />
                              </button>
                            </div>

                            <div className={`mt-4 grid gap-4 ${line.product?.options?.length ? 'sm:grid-cols-2' : ''}`}>
                              {line.product?.options?.length ? (
                                <div className="sm:col-span-2">
                                  {renderOption(fieldErrors, line, id)}
                                </div>
                              ) : null}
                              <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor={`${id}-quantity`}>
                                  Quantity required
                                </label>
                                <input
                                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10 ${fieldErrors[`line-${line.uid}-quantity`] ? 'border-orange/40' : 'border-line'}`}
                                  id={`${id}-quantity`}
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  max={MAX_QUANTITY}
                                  step={1}
                                  value={line.quantity}
                                  onChange={(event) => updateLine(line.uid, { quantity: event.target.value })}
                                  aria-invalid={Boolean(fieldErrors[`line-${line.uid}-quantity`])}
                                  aria-describedby={fieldErrors[`line-${line.uid}-quantity`] ? `${id}-quantity-error` : undefined}
                                />
                                {fieldErrors[`line-${line.uid}-quantity`] && (
                                  <p className="mt-2 text-xs font-semibold text-orange" id={`${id}-quantity-error`}>{fieldErrors[`line-${line.uid}-quantity`]}</p>
                                )}
                              </div>
                              <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor={`${id}-note`}>
                                  Item note <span className="font-normal normal-case tracking-normal text-muted">(optional)</span>
                                </label>
                                <input
                                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10 ${fieldErrors[`line-${line.uid}-note`] ? 'border-orange/40' : 'border-line'}`}
                                  id={`${id}-note`}
                                  placeholder="e.g. separate packaging"
                                  maxLength={500}
                                  value={line.note}
                                  onChange={(event) => updateLine(line.uid, { note: event.target.value })}
                                  aria-invalid={Boolean(fieldErrors[`line-${line.uid}-note`])}
                                />
                                {fieldErrors[`line-${line.uid}-note`] && (
                                  <p className="mt-2 text-xs font-semibold text-orange" id={`${id}-note-error`}>{fieldErrors[`line-${line.uid}-note`]}</p>
                                )}
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  <div className="mt-6 rounded-2xl border border-dashed border-green/25 bg-sage/20 p-4 sm:p-5">
                    <label className="block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor="quote-product-search">
                      Add a product
                    </label>
                    <div className="relative mt-3">
                      <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                      <input
                        className="w-full rounded-xl border border-line bg-white py-3 pl-12 pr-4 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
                        id="quote-product-search"
                        type="search"
                        autoComplete="off"
                        placeholder="Search for a product to add…"
                        disabled={lines.length >= MAX_LINES}
                        value={pickerSearch}
                        onChange={(event) => {
                          setPickerSearch(event.target.value)
                          setPickerError(null)
                        }}
                      />
                    </div>
                    {pickerError && (
                      <p className="mt-3 rounded-xl border border-orange/25 bg-orange/5 p-3 text-sm font-semibold text-orange" role="alert">
                        {pickerError}
                      </p>
                    )}
                    {pickerSearch.trim().length >= 2 && (
                      <div className="mt-3">
                        {picker.isLoading ? (
                          <p className="text-sm text-muted">Searching…</p>
                        ) : picker.hasError ? (
                          <p className="text-sm text-muted">Products could not be searched right now.</p>
                        ) : picker.suggestions.length === 0 ? (
                          <p className="text-sm text-muted">No products match your search.</p>
                        ) : (
                          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white" role="listbox" aria-label="Product search results">
                            {picker.suggestions.map((product) => {
                              const alreadyAdded = productAlreadyAdded(product)
                              return (
                                <li key={product.id}>
                                  <button
                                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-sage/30 disabled:cursor-not-allowed disabled:opacity-50"
                                    type="button"
                                    role="option"
                                    aria-selected="false"
                                    disabled={alreadyAdded}
                                    onClick={() => addProductLine(product)}
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate text-sm font-bold text-green-dark">{product.name}</span>
                                      <span className="mt-0.5 block truncate text-xs text-muted">{product.category}</span>
                                    </span>
                                    <span className="shrink-0 text-xs font-semibold text-muted">
                                      {alreadyAdded ? 'Added' : formatPrice(product.discountedPrice)}
                                    </span>
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  {isLoadingPreselect ? (
                    <p className="mt-6 rounded-xl bg-sage/35 p-4 text-sm text-muted">Loading preselected product…</p>
                  ) : null}
                  {lines.length > 0 && (
                    <p className="mt-4 text-xs text-muted">
                      {lines.length} {lines.length === 1 ? 'product' : 'products'} · {totalUnits} {totalUnits === 1 ? 'unit' : 'units'} requested
                    </p>
                  )}
                </section>

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