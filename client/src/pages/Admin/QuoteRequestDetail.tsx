import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../services/api'
import {
  getAdminQuoteRequest,
  prepareAdminQuotePricing,
  updateAdminQuoteRequestNote,
  updateAdminQuoteRequestStatus,
  type AdminQuoteRequestDetail,
  type QuoteRequestStatus,
} from '../../services/quoteService'
import { formatQuoteStatus, getQuoteStatusOptions } from '../../utils/quoteStatus'
import { formatDate } from '../../utils/dateFormat'
import { formatPrice } from '../../utils/formatPrice'
import { useToast } from '../../components/ui/Toast'
import { SelectField } from '../../components/ui/SelectField'
import { scrollToTopInstant } from '../../utils/browserCompatibility'

const statusClass = (status: QuoteRequestStatus) => {
  if (status === 'COMPLETED' || status === 'ACCEPTED') return 'bg-green/10 text-green'
  if (status === 'CONTACTED' || status === 'QUOTED' || status === 'CANCELLED') return 'bg-orange/10 text-orange'
  return 'bg-sage text-green-dark'
}

const isTerminal = (status: QuoteRequestStatus) => status === 'COMPLETED' || status === 'CANCELLED'

const MONEY_INPUT_PATTERN = /^\d+(\.\d{1,2})?$/
const isValidUnitPrice = (value: string) => MONEY_INPUT_PATTERN.test(value.trim()) && Number(value) > 0
const isValidDeliveryFee = (value: string) => MONEY_INPUT_PATTERN.test(value.trim())

const previewCents = (items: Array<{ id: string; quantity: number }>, unitPrices: Record<string, string>) =>
  items.reduce(
    (total, item) => {
      const unitPrice = Number(unitPrices[item.id] ?? '')
      const amount = Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0
      return total + Math.round(amount * item.quantity * 100)
    },
    0,
  )

export type QuoteFulfillmentOption = 'PICKUP' | 'DELIVERY'

export function QuoteRequestDetail() {
  const { reference } = useParams()
  const [quote, setQuote] = useState<AdminQuoteRequestDetail | null>(null)
  const [status, setStatus] = useState<QuoteRequestStatus>('PENDING')
  const [internalNote, setInternalNote] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingStatus, setIsSavingStatus] = useState(false)
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [isPreparingQuotation, setIsPreparingQuotation] = useState(false)
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({})
  const [deliveryFeeInput, setDeliveryFeeInput] = useState('0')
  const [fulfillmentMethod, setFulfillmentMethod] = useState<QuoteFulfillmentOption>('PICKUP')
  const [quotationError, setQuotationError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    if (!reference) return
    getAdminQuoteRequest(reference)
      .then((loaded) => {
        setQuote(loaded)
        setStatus(loaded.status)
        setInternalNote(loaded.adminNote ?? '')
        setUnitPrices(Object.fromEntries(loaded.items.map((item) => [item.id, item.quotedUnitPrice ?? ''])))
        setDeliveryFeeInput(loaded.deliveryFee ?? '0')
        setFulfillmentMethod(loaded.fulfillmentMethod === 'DELIVERY' ? 'DELIVERY' : 'PICKUP')
      })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Quote request details could not be loaded.'))
      .finally(() => setIsLoading(false))
  }, [reference])

  const persistStatus = async () => {
    if (!quote || !reference || status === quote.status) return
    setIsSavingStatus(true)
    setError(null)
    try {
      setQuote(await updateAdminQuoteRequestStatus(reference, status))
      showToast('Quote request status updated.', 'success')
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'Quote request status could not be updated.', 'error')
    } finally {
      setIsSavingStatus(false)
    }
  }

  const persistNote = async () => {
    if (!quote || !reference || internalNote === (quote.adminNote ?? '')) return
    setIsSavingNote(true)
    setError(null)
    try {
      setQuote(await updateAdminQuoteRequestNote(reference, internalNote))
      showToast('Internal note saved.', 'success')
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'The internal note could not be saved.', 'error')
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleFulfillmentMethodChange = (value: QuoteFulfillmentOption) => {
    setFulfillmentMethod(value)
    if (value === 'PICKUP') setDeliveryFeeInput('0')
  }

  const persistQuotation = async () => {
    if (!quote || !reference || quote.items.length === 0) return
    setQuotationError(null)
    for (const item of quote.items) {
      if (!isValidUnitPrice(unitPrices[item.id] ?? '')) {
        setQuotationError('Enter a valid unit price for every item (a positive amount with up to two decimal places).')
        return
      }
    }
    if (fulfillmentMethod === 'PICKUP' && Number(deliveryFeeInput) > 0) {
      setQuotationError('Pickup quotations cannot include a delivery fee.')
      return
    }
    if (fulfillmentMethod === 'DELIVERY' && !isValidDeliveryFee(deliveryFeeInput)) {
      setQuotationError('Delivery fee must be a non-negative amount with up to two decimal places.')
      return
    }
    setIsPreparingQuotation(true)
    try {
      const updated = await prepareAdminQuotePricing(reference, {
        items: quote.items.map((item) => ({ itemId: item.id, quotedUnitPrice: (unitPrices[item.id] ?? '').trim() })),
        deliveryFee: fulfillmentMethod === 'PICKUP' ? '0' : (deliveryFeeInput.trim() || '0'),
        fulfillmentMethod,
      })
      setQuote(updated)
      setStatus(updated.status)
      showToast('Quotation prepared.', 'success')
      scrollToTopInstant()
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'The quotation could not be prepared.', 'error')
    } finally {
      setIsPreparingQuotation(false)
    }
  }

  if (isLoading) return <div className="rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading quote request…</div>
  if (!quote) return <div><div className="rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">{error ?? 'Quote request not found.'}</div><Link className="mt-5 inline-block font-bold text-green" to="/admin/quote-requests">Back to quote requests</Link></div>

  const statusOptions = getQuoteStatusOptions(status)
  const canPrepareQuotation = status === 'PENDING' || status === 'CONTACTED'
  const hasQuotation = quote.quotedTotal !== null || quote.quotedAt !== null
  const previewDeliveryFeeCents = Number.isFinite(Number(deliveryFeeInput)) && Number(deliveryFeeInput) > 0
    ? Math.round(Number(deliveryFeeInput) * 100)
    : 0
  const previewSubtotalCents = previewCents(quote.items, unitPrices)
  const previewTotalCents = previewSubtotalCents + previewDeliveryFeeCents

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link className="text-sm font-bold text-green hover:text-orange" to="/admin/quote-requests">← Back to quote requests</Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-orange">Quote request detail</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">{quote.quoteNumber}</h1>
          <p className="mt-3 text-sm text-muted">Received {formatDate(quote.createdAt, true)}</p>
          <p className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]">
            <span className={quote.shoppingMode === 'WHOLESALE' ? 'inline-block size-2 rounded-full bg-orange' : 'inline-block size-2 rounded-full bg-green'} />
            <span className={quote.shoppingMode === 'WHOLESALE' ? 'text-orange' : 'text-green-dark'}>{quote.shoppingMode === 'WHOLESALE' ? 'Wholesale Request' : 'Retail Request'}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className={`rounded-full px-3 py-2 text-xs font-bold ${statusClass(quote.status)}`}>{formatQuoteStatus(quote.status)}</span>
          {isTerminal(quote.status) && <span className="rounded-full bg-sage px-3 py-2 text-xs font-bold text-green-dark">Closed</span>}
        </div>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}

      <section className="mt-8 grid gap-5 lg:grid-cols-2" aria-label="Customer and request details">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-green-dark">Customer</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Name</dt>
              <dd className="mt-1 font-semibold text-green-dark">{quote.customerName}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Email</dt>
              <dd className="mt-1 break-words text-muted"><a className="text-green hover:text-orange" href={`mailto:${quote.customerEmail}`}>{quote.customerEmail}</a></dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Phone</dt>
              <dd className="mt-1 break-words text-muted"><a className="text-green hover:text-orange" href={`tel:${quote.customerPhone}`}>{quote.customerPhone}</a></dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-green-dark">Request message</h2>
          {quote.message ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted">{quote.message}</p>
          ) : (
            <p className="mt-4 text-sm text-muted">No additional message was included with this request.</p>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-label="Requested items">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-green-dark">Requested items</h2>
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{quote.items.length} {quote.items.length === 1 ? 'item' : 'items'}</span>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line bg-sage/35 text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-3 font-bold">Product</th>
                <th className="px-4 py-3 font-bold">Option / size</th>
                <th className="px-4 py-3 font-bold text-right">Quantity</th>
                <th className="px-4 py-3 font-bold">Item note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {quote.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <Link className="break-words font-semibold text-green-dark hover:text-orange" to={`/admin/products/${item.productId}`}>{item.productName}</Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{item.productOptionLabel ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-green-dark">{item.quantity}</td>
                  <td className="max-w-[260px] break-words px-4 py-3 text-muted">{item.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {canPrepareQuotation && (
        <section className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-label="Prepare quotation">
          <div>
            <h2 className="text-lg font-bold text-green-dark">Prepare quotation</h2>
            <p className="mt-1 text-sm text-muted">Enter a quoted unit price for each requested item and an optional delivery fee. Totals are calculated on the server and saved as a snapshot, so later catalog price changes never affect this quotation.</p>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-line bg-sage/35 text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="px-4 py-3 font-bold">Product</th>
                  <th className="px-4 py-3 font-bold text-right">Quantity</th>
                  <th className="px-4 py-3 font-bold">Agreed unit price</th>
                  <th className="px-4 py-3 font-bold text-right">Line subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {quote.items.map((item) => {
                  const unitPrice = Number(unitPrices[item.id] ?? '')
                  const lineSubtotal = Number.isFinite(unitPrice) && unitPrice > 0 ? Math.round(unitPrice * item.quantity * 100) / 100 : 0
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <span className="break-words font-semibold text-green-dark">{item.productName}</span>
                        <span className="block text-xs text-muted">{item.productOptionLabel ?? 'Standard option'}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-green-dark">{item.quantity}</td>
                      <td className="px-4 py-3">
                        <label className="sr-only" htmlFor={`quote-unit-price-${item.id}`}>Quoted unit price for {item.productName}</label>
                        <div className="flex max-w-44 items-center rounded-xl border border-line bg-cream focus-within:border-green focus-within:ring-2 focus-within:ring-green/10">
                          <span className="pl-3 text-sm font-bold text-muted">₦</span>
                          <input
                            className="w-full bg-transparent px-3 py-2 text-right text-sm font-bold text-green-dark outline-none"
                            id={`quote-unit-price-${item.id}`}
                            inputMode="decimal"
                            placeholder="0.00"
                            value={unitPrices[item.id] ?? ''}
                            onChange={(event) => setUnitPrices((current) => ({ ...current, [item.id]: event.target.value }))}
                          />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-green-dark">{formatPrice(lineSubtotal)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <span className="text-sm font-bold text-green-dark">Fulfillment method</span>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex gap-3">
                {(['PICKUP', 'DELIVERY'] as const).map((option) => (
                  <button
                    className={`rounded-xl border px-5 py-3 text-sm font-bold transition-colors ${
                      fulfillmentMethod === option
                        ? 'border-green bg-sage text-green-dark'
                        : 'border-line bg-cream/40 text-muted hover:border-green/40'
                    }`}
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={fulfillmentMethod === option}
                    onClick={() => handleFulfillmentMethodChange(option)}
                  >
                    {option === 'PICKUP' ? 'Pickup' : 'Delivery'}
                  </button>
                ))}
              </div>
              <p className="max-w-sm text-xs leading-5 text-muted">
                {fulfillmentMethod === 'PICKUP'
                  ? 'No delivery fee applies. The customer collects the order from the store.'
                  : 'A delivery fee can be added below and is charged to the customer.'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            {fulfillmentMethod === 'DELIVERY' && (
              <label className="block max-w-sm text-sm font-bold text-green-dark" htmlFor="quote-delivery-fee">
                Delivery fee <span className="font-normal normal-case tracking-normal text-muted">(optional — {formatPrice(0)} if blank)</span>
                <div className="mt-2 flex items-center rounded-xl border border-line bg-cream focus-within:border-green focus-within:ring-2 focus-within:ring-green/10">
                  <span className="pl-3 text-sm font-bold text-muted">₦</span>
                  <input
                    className="w-full bg-transparent px-3 py-2.5 text-right text-sm font-bold text-green-dark outline-none"
                    id="quote-delivery-fee"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={deliveryFeeInput}
                    onChange={(event) => setDeliveryFeeInput(event.target.value)}
                  />
                </div>
              </label>
            )}
            <dl className="ml-auto w-full max-w-xs space-y-2 rounded-xl border border-line bg-sage/25 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Items subtotal</dt>
                <dd className="font-bold text-green-dark">{formatPrice(previewSubtotalCents / 100)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Delivery fee</dt>
                <dd className="font-bold text-green-dark">{fulfillmentMethod === 'PICKUP' || previewDeliveryFeeCents === 0 ? 'Free' : formatPrice(previewDeliveryFeeCents / 100)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
                <dt className="font-semibold text-green-dark">Quoted total</dt>
                <dd className="text-lg font-bold text-green">{formatPrice((fulfillmentMethod === 'PICKUP' ? previewSubtotalCents : previewTotalCents) / 100)}</dd>
              </div>
            </dl>
          </div>

          {quotationError && <div className="mt-4 rounded-xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{quotationError}</div>}

          <div className="mt-4 border-t border-line pt-4 text-right">
            <p className="mb-3 text-xs text-muted">Submitting moves this request to <strong className="font-bold text-green-dark">Quoted</strong> and locks the prices and fulfillment method.</p>
            <button
              className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream disabled:cursor-not-allowed disabled:opacity-50 hover:bg-green-dark"
              type="button"
              disabled={isPreparingQuotation}
              onClick={() => void persistQuotation()}
            >
              {isPreparingQuotation ? 'Preparing…' : 'Prepare quotation'}
            </button>
          </div>
        </section>
      )}

      {hasQuotation && !canPrepareQuotation && (
        <section className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-label="Quotation">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-green-dark">Quotation</h2>
              <p className="mt-1 text-sm text-muted">Saved on {quote.quotedAt ? formatDate(quote.quotedAt, true) : '—'}. These prices are a snapshot from the catalog at the time of quoting.</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-sage/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-green-dark">
              <span className={`inline-block size-2 rounded-full ${quote.fulfillmentMethod === 'DELIVERY' ? 'bg-orange' : 'bg-green'}`} />
              {quote.fulfillmentMethod === 'DELIVERY' ? 'Delivery' : 'Pickup'}
            </span>
            {quote.convertedOrderNumber && (
              <Link className="font-bold text-green hover:text-orange" to={`/admin/orders/${quote.convertedOrderNumber}`}>
                Converted into order {quote.convertedOrderNumber} →
              </Link>
            )}
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-line bg-sage/35 text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="px-4 py-3 font-bold">Product</th>
                  <th className="px-4 py-3 font-bold text-right">Quantity</th>
                  <th className="px-4 py-3 font-bold text-right">Unit price</th>
                  <th className="px-4 py-3 font-bold text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {quote.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <Link className="break-words font-semibold text-green-dark hover:text-orange" to={`/admin/products/${item.productId}`}>{item.productName}</Link>
                      <span className="block text-xs text-muted">{item.productOptionLabel ?? 'Standard option'}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-green-dark">{item.quantity}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-muted">{item.quotedUnitPrice === null ? '—' : formatPrice(Number(item.quotedUnitPrice))}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-green-dark">{item.quotedUnitPrice === null ? '—' : formatPrice(Number(item.quotedUnitPrice) * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="mt-4 ml-auto w-full max-w-xs space-y-2 rounded-xl border border-line bg-sage/25 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Items subtotal</dt>
              <dd className="font-bold text-green-dark">{quote.quotedSubtotal === null ? '—' : formatPrice(Number(quote.quotedSubtotal))}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Delivery fee</dt>
              <dd className="font-bold text-green-dark">{quote.deliveryFee === null ? '—' : Number(quote.deliveryFee) === 0 ? 'Free' : formatPrice(Number(quote.deliveryFee))}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
              <dt className="font-semibold text-green-dark">Quoted total</dt>
              <dd className="text-lg font-bold text-green">{quote.quotedTotal === null ? '—' : formatPrice(Number(quote.quotedTotal))}</dd>
            </div>
          </dl>
        </section>
      )}

      {(quote.acceptedAt !== null || quote.rejectedAt !== null) && (
        <section className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-label="Customer response">
          <h2 className="text-lg font-bold text-green-dark">Customer response</h2>
          {quote.acceptedAt !== null ? (
            <div className="mt-4 rounded-xl border border-green/20 bg-sage/30 p-4">
              <p className="font-bold text-green">Accepted by the customer</p>
              <p className="mt-1 text-sm text-muted">Accepted {formatDate(quote.acceptedAt, true)}.</p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-orange/25 bg-orange/5 p-4">
              <p className="font-bold text-orange">Declined by the customer</p>
              <p className="mt-1 text-sm text-muted">Declined {quote.rejectedAt ? formatDate(quote.rejectedAt, true) : '—'}.</p>
              {quote.rejectionReason && (
                <p className="mt-2 text-sm leading-6 text-muted"><strong className="text-green-dark">Reported reason:</strong> {quote.rejectionReason}</p>
              )}
            </div>
          )}
        </section>
      )}

      <section className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-label="Status and notes">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-bold text-green-dark">Quote status</h2>
            <p className="mt-1 text-sm text-muted">Move the request through your normal flow as you respond to the customer.</p>
          </div>
          {!isTerminal(status) && (
            <div className="flex items-end gap-2">
              <label className="text-xs font-bold text-green-dark">
                Status
                <SelectField
                  className="mt-2 w-44"
                  options={statusOptions.map((option) => ({
                    value: option,
                    label: option === status ? formatQuoteStatus(option) : `Move to ${formatQuoteStatus(option).toLowerCase()}`,
                  }))}
                  value={status}
                  onChange={(value) => setStatus(value as QuoteRequestStatus)}
                />
              </label>
              <button
                className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream disabled:cursor-not-allowed disabled:opacity-50 hover:bg-green-dark"
                type="button"
                disabled={isSavingStatus || status === quote.status}
                onClick={() => void persistStatus()}
              >
                {isSavingStatus ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-line pt-6">
          <label className="block text-sm font-bold text-green-dark" htmlFor="admin-quote-note">
            Internal note <span className="font-normal normal-case tracking-normal text-muted">(never shown to customers)</span>
          </label>
          <textarea
            className="mt-2 w-full resize-y rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
            id="admin-quote-note"
            rows={4}
            maxLength={2000}
            placeholder="Internal context for this request — pricing notes, agreed amounts, etc. This note is private to the admin portal."
            value={internalNote}
            onChange={(event) => setInternalNote(event.target.value)}
          />
          <div className="mt-3 flex justify-end">
            <button
              className="rounded-xl border border-green/25 px-5 py-2.5 text-sm font-bold text-green disabled:cursor-not-allowed disabled:opacity-50 hover:bg-green hover:text-cream"
              type="button"
              disabled={isSavingNote || internalNote === (quote.adminNote ?? '')}
              onClick={() => void persistNote()}
            >
              {isSavingNote ? 'Saving…' : 'Save note'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}