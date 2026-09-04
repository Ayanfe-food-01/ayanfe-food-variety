import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { useInitialRouteLoad } from '../hooks/useInitialRouteLoad'
import { ApiError } from '../services/api'
import {
  acceptCustomerQuoteRequest,
  convertQuoteToOrder,
  getCustomerQuoteRequest,
  rejectCustomerQuoteRequest,
  type QuoteRequest,
  type QuoteRequestStatus,
} from '../services/quoteService'
import { formatDate } from '../utils/dateFormat'
import { lockBodyScroll } from '../utils/browserCompatibility'

const formatPrice = (price: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(price))

const quoteStatusCopy: Record<QuoteRequestStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending review', className: 'bg-sage text-green-dark' },
  CONTACTED: { label: 'We contacted you', className: 'bg-sage text-green-dark' },
  QUOTED: { label: 'Ready for you', className: 'bg-orange/15 text-orange' },
  ACCEPTED: { label: 'Accepted', className: 'bg-green/10 text-green' },
  COMPLETED: { label: 'Completed', className: 'bg-green text-cream' },
  CANCELLED: { label: 'Declined', className: 'bg-orange/10 text-orange' },
}

export function CustomerQuoteDetail() {
  const { reference } = useParams()
  const navigate = useNavigate()
  const { user, isLoading: isAuthLoading, openAuth } = useCustomerAuth()
  const [quote, setQuote] = useState<QuoteRequest | null>(null)
  const [error, setError] = useState<string | null>(null)

  useInitialRouteLoad(!isAuthLoading && (!user || !!quote || !!error))
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false)
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [city, setCity] = useState('')
  const [deliveryInstructions, setDeliveryInstructions] = useState('')

  useEffect(() => {
    if (isAuthLoading || !user || !reference) return
    let active = true
    getCustomerQuoteRequest(reference)
      .then((result) => {
        if (active) setQuote(result)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof ApiError ? reason.message : 'Quote could not be loaded.')
      })
    return () => { active = false }
  }, [isAuthLoading, reference, user])

  useEffect(() => {
    if (!isAcceptDialogOpen && !isDeclineDialogOpen && !isConvertDialogOpen) return
    const releaseBodyScroll = lockBodyScroll()
    return () => { releaseBodyScroll() }
  }, [isAcceptDialogOpen, isDeclineDialogOpen, isConvertDialogOpen])

  const closeDialogs = () => {
    setIsAcceptDialogOpen(false)
    setIsDeclineDialogOpen(false)
    setIsConvertDialogOpen(false)
    setDeclineReason('')
    setActionError(null)
  }

  const confirmAccept = async () => {
    if (!reference || !quote) return
    setIsBusy(true)
    setActionError(null)
    try {
      setQuote(await acceptCustomerQuoteRequest(reference))
      closeDialogs()
    } catch (caught: unknown) {
      setActionError(caught instanceof ApiError ? caught.message : 'The quotation could not be accepted.')
    } finally {
      setIsBusy(false)
    }
  }

  const confirmDecline = async () => {
    if (!reference || !quote) return
    setIsBusy(true)
    setActionError(null)
    try {
      setQuote(await rejectCustomerQuoteRequest(reference, declineReason.trim() || undefined))
      closeDialogs()
    } catch (caught: unknown) {
      setActionError(caught instanceof ApiError ? caught.message : 'The quotation could not be declined.')
    } finally {
      setIsBusy(false)
    }
  }

  const confirmConvert = async () => {
    if (!reference || !quote) return
    const isDelivery = quote.fulfillmentMethod === 'DELIVERY'
    const address = deliveryAddress.trim()
    const town = city.trim()
    if (isDelivery && (!address || !town)) {
      setActionError('A delivery address and city are required for delivery.')
      return
    }
    setIsBusy(true)
    setActionError(null)
    try {
      const order = await convertQuoteToOrder(reference, {
        deliveryAddress: isDelivery ? address : undefined,
        city: isDelivery ? town : undefined,
        deliveryInstructions: deliveryInstructions.trim() || undefined,
      })
      setIsConvertDialogOpen(false)
      navigate(`/order-confirmation/${order.orderNumber}`)
    } catch (caught: unknown) {
      setActionError(caught instanceof ApiError ? caught.message : 'The quotation could not be converted into an order.')
    } finally {
      setIsBusy(false)
    }
  }

  const isQuoted = quote?.status === 'QUOTED'
  const isAccepted = quote?.status === 'ACCEPTED'
  const isWaiting = quote?.status === 'PENDING' || quote?.status === 'CONTACTED'
  const hasPricing = isQuoted || isAccepted || quote?.status === 'COMPLETED'
  const isConverted = quote?.status === 'COMPLETED' && quote.convertedOrderNumber !== null
  const isDelivery = quote?.fulfillmentMethod === 'DELIVERY'

  return (
    <>
      <Navbar />
      <main className="container py-12 sm:py-16 lg:py-24">
        {!isAuthLoading && !user ? (
          <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm">
            <h1 className="text-3xl font-bold text-green-dark">Choose how to continue</h1>
            <p className="mt-3 text-sm leading-6 text-muted">Sign in to view your quotation and respond to it.</p>
            <button className="mt-6 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="button" onClick={() => openAuth()}>
              Continue to sign in
            </button>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">{error}</div>
        ) : !quote ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted">Loading quotation…</p>
        ) : (
          <div className="mx-auto max-w-3xl">
            <Link className="text-sm font-bold text-green hover:text-orange" to="/quotes">← Back to quotes</Link>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Quote request</p>
                <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark">{quote.quoteNumber}</h1>
                <p className="mt-2 text-sm text-muted">Requested {formatDate(quote.createdAt)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${quoteStatusCopy[quote.status].className}`}>{quoteStatusCopy[quote.status].label}</span>
            </div>

            {quote.message && (
              <div className="mt-6 rounded-2xl border border-line bg-cream/60 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-green-dark">Your message to the store</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{quote.message}</p>
              </div>
            )}

            {isWaiting && (
              <div className="mt-6 rounded-2xl border border-green/20 bg-sage/30 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-green-dark">Your quotation is being prepared</h2>
                <p className="mt-2 text-sm leading-6 text-muted">We will provide your quotation once it is ready.</p>
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-green-dark">Requested items</h2>
                {isQuoted && quote.quotedAt && <p className="text-xs text-muted">Quoted {formatDate(quote.quotedAt, true)}</p>}
                {isAccepted && quote.acceptedAt && <p className="text-xs text-muted">Accepted {formatDate(quote.acceptedAt, true)}</p>}
              </div>
              <div className="mt-5 divide-y divide-line">
                {quote.items.map((item) => {
                  const subtotal =
                    item.quotedUnitPrice !== null
                      ? (Number(item.quotedUnitPrice) * item.quantity).toFixed(2)
                      : null
                  return (
                    <div className="flex items-center justify-between gap-4 py-4" key={item.id}>
                      <div>
                        <p className="font-bold text-green-dark">{item.productName}</p>
                        {item.productOptionLabel && <p className="mt-0.5 text-xs font-semibold text-orange">{item.productOptionLabel}</p>}
                        <p className="mt-1 text-xs text-muted">
                          Quantity {item.quantity}
                          {item.quotedUnitPrice !== null && <> · {formatPrice(item.quotedUnitPrice)} each</>}
                        </p>
                        {item.note && <p className="mt-1 text-xs text-muted">Note: {item.note}</p>}
                      </div>
                      {subtotal !== null && <strong className="text-sm text-green-dark">{formatPrice(subtotal)}</strong>}
                    </div>
                  )
                })}
              </div>
              {hasPricing && quote.quotedSubtotal !== null && quote.quotedTotal !== null && (
                <div className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
                  <div className="flex justify-between text-muted"><span>Subtotal</span><strong className="text-green-dark">{formatPrice(quote.quotedSubtotal)}</strong></div>
                  <div className="flex justify-between text-muted">
                    <span>Delivery fee</span>
                    <strong className="text-green-dark">{Number(quote.deliveryFee ?? '0') === 0 ? 'Free' : formatPrice(quote.deliveryFee ?? '0')}</strong>
                  </div>
                  {isDelivery && <p className="text-xs text-muted">Delivery to your address at checkout. The delivery fee is {Number(quote.deliveryFee ?? '0') === 0 ? 'waived' : 'included in the total'}.</p>}
                  {quote.fulfillmentMethod === 'PICKUP' && <p className="text-xs text-muted">Pickup at the store. No delivery fee applies.</p>}
                  <div className="flex justify-between pt-2 text-base font-bold text-green-dark"><span>Total</span><span>{formatPrice(quote.quotedTotal)}</span></div>
                </div>
              )}
            </div>

            {quote.status === 'ACCEPTED' && quote.acceptedAt && (
              <div className="mt-6 rounded-2xl border border-green/20 bg-sage/30 p-6">
                <p className="font-bold text-green">Quotation accepted</p>
                <p className="mt-1 text-sm text-muted">Accepted {formatDate(quote.acceptedAt, true)}. You can now continue to place your order.</p>
              </div>
            )}

            {isConverted && (
              <div className="mt-6 rounded-2xl border border-green/20 bg-sage/30 p-6">
                <p className="font-bold text-green">Converted to an order</p>
                <p className="mt-1 text-sm text-muted">
                  This quotation was converted into order{' '}
                  <Link className="font-bold text-green underline" to={`/order-confirmation/${quote.convertedOrderNumber!}`}>{quote.convertedOrderNumber}</Link>.
                </p>
              </div>
            )}

            {quote.status === 'CANCELLED' && quote.rejectedAt && (
              <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-6">
                <p className="font-bold text-orange">Quotation declined</p>
                <p className="mt-1 text-sm text-muted">Declined {formatDate(quote.rejectedAt, true)}.</p>
              </div>
            )}

            {(isQuoted || isAccepted) && !isConverted && (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  className="rounded-full bg-green px-6 py-3 text-sm font-bold text-cream hover:bg-green-dark"
                  type="button"
                  onClick={() => { setActionError(null); setIsConvertDialogOpen(true) }}
                >
                  Continue to order
                </button>
                {isQuoted && (
                  <button
                    className="rounded-full border border-green/40 px-6 py-3 text-sm font-bold text-green transition-colors hover:bg-sage/40"
                    type="button"
                    onClick={() => { setActionError(null); setIsAcceptDialogOpen(true) }}
                  >
                    Accept quotation
                  </button>
                )}
                <button
                  className="rounded-full border border-orange/40 px-6 py-3 text-sm font-bold text-orange transition-colors hover:bg-orange/10"
                  type="button"
                  onClick={() => { setActionError(null); setIsDeclineDialogOpen(true) }}
                >
                  Decline quotation
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />

      {isAcceptDialogOpen && quote && (
        <ConfirmDialog
          eyebrow="Accept quotation"
          title="Accept this quotation?"
          description={`You are accepting the quotation ${quote.quoteNumber} for ${formatPrice(quote.quotedTotal ?? '0')}. You can then continue to place your order.`}
          error={actionError}
          isBusy={isBusy}
          confirmLabel="Accept quotation"
          busyLabel="Accepting…"
          onCancel={() => { setActionError(null); setIsAcceptDialogOpen(false) }}
          onConfirm={() => void confirmAccept()}
        />
      )}

      {isDeclineDialogOpen && quote && (
        <div className="safe-modal-backdrop fixed inset-0 z-50 flex min-h-dvh items-center justify-center overflow-hidden bg-green-dark/50" role="presentation" onClick={(event) => {
          if (event.target === event.currentTarget) closeDialogs()
        }}>
          <div className="y-scrollbar my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="decline-quote-title">
            <h2 id="decline-quote-title" className="text-2xl font-bold text-green-dark">Decline this quotation?</h2>
            <p className="mt-3 text-sm leading-6 text-muted">You will not be committed to this quotation. Let us know if anything can be improved.</p>
            <label className="mt-6 block text-sm font-bold text-green-dark">
              Reason <span className="font-normal text-muted">(optional)</span>
              <textarea
                className="mt-2 min-h-24 w-full resize-y rounded-xl border border-line bg-cream/60 px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
                value={declineReason}
                onChange={(event) => setDeclineReason(event.target.value)}
                maxLength={500}
                placeholder="Tell us why you are declining (optional)"
              />
            </label>
            {actionError && <p className="mt-4 rounded-xl border border-orange/25 bg-orange/5 p-3 text-sm text-orange" role="alert">{actionError}</p>}
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="rounded-full border border-line px-5 py-3 text-sm font-bold text-green-dark hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={closeDialogs} disabled={isBusy}>
                Keep quotation
              </button>
              <button className="rounded-full bg-orange px-5 py-3 text-sm font-bold text-white hover:bg-orange/90 disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={() => void confirmDecline()} disabled={isBusy}>
                {isBusy ? 'Declining…' : 'Decline quotation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isConvertDialogOpen && quote && (
        <div className="safe-modal-backdrop fixed inset-0 z-50 flex min-h-dvh items-center justify-center overflow-hidden bg-green-dark/50" role="presentation" onClick={(event) => {
          if (event.target === event.currentTarget) closeDialogs()
        }}>
          <div className="y-scrollbar my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="convert-quote-title">
            <h2 id="convert-quote-title" className="text-2xl font-bold text-green-dark">Continue to order</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              {isDelivery
                ? `Place this order for delivery to your address. The delivery fee is ${Number(quote.deliveryFee ?? '0') === 0 ? 'waived' : formatPrice(quote.deliveryFee ?? '0')} and will be part of the order total.`
                : 'Place this quotation as an order for pickup at the store. After placing it you can submit your payment proof.'}
            </p>
            {isDelivery && (
              <div className="mt-6 space-y-4">
                <label className="block text-sm font-bold text-green-dark">
                  Delivery address <span className="text-orange">*</span>
                  <textarea
                    className="mt-2 min-h-20 w-full resize-y rounded-xl border border-line bg-cream/60 px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
                    value={deliveryAddress}
                    onChange={(event) => setDeliveryAddress(event.target.value)}
                    maxLength={2000}
                    placeholder="Street address, area, landmark"
                  />
                </label>
                <label className="block text-sm font-bold text-green-dark">
                  City <span className="text-orange">*</span>
                  <input
                    className="mt-2 w-full rounded-xl border border-line bg-cream/60 px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    maxLength={120}
                    placeholder="Your city"
                  />
                </label>
                <label className="block text-sm font-bold text-green-dark">
                  Delivery instructions <span className="font-normal text-muted">(optional)</span>
                  <textarea
                    className="mt-2 min-h-20 w-full resize-y rounded-xl border border-line bg-cream/60 px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
                    value={deliveryInstructions}
                    onChange={(event) => setDeliveryInstructions(event.target.value)}
                    maxLength={2000}
                    placeholder="Anything the delivery team should know"
                  />
                </label>
              </div>
            )}
            {actionError && <p className="mt-4 rounded-xl border border-orange/25 bg-orange/5 p-3 text-sm text-orange" role="alert">{actionError}</p>}
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="rounded-full border border-line px-5 py-3 text-sm font-bold text-green-dark hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={closeDialogs} disabled={isBusy}>
                Back
              </button>
              <button className="rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={() => void confirmConvert()} disabled={isBusy}>
                {isBusy ? 'Placing your order…' : `Place order (${formatPrice(quote.quotedTotal ?? '0')})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}