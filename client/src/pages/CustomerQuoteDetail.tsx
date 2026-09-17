import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { useInitialRouteLoad } from '../hooks/useInitialRouteLoad'
import { ApiError } from '../services/api'
import {
  acceptCustomerQuoteRequest,
  getCustomerQuoteRequest,
  rejectCustomerQuoteRequest,
  type QuoteRequest,
} from '../services/quoteService'
import { formatDate } from '../utils/dateFormat'
import { AcceptQuoteDialog } from './customer-quote-detail/AcceptQuoteDialog'
import { DeclineQuoteDialog } from './customer-quote-detail/DeclineQuoteDialog'
import { QuoteActionPanel } from './customer-quote-detail/QuoteActionPanel'
import { QuoteStatusBadge } from './customer-quote-detail/QuoteStatusBadge'

const formatPrice = (price: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(price))

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

  const closeDialogs = () => {
    setIsAcceptDialogOpen(false)
    setIsDeclineDialogOpen(false)
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

  const goToCheckout = () => {
    if (!reference) return
    navigate(`/checkout/quote/${encodeURIComponent(reference)}`)
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
      <main className="container py-10 sm:py-14">
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
          <div className="animate-pulse" role="status" aria-label="Loading quotation">
            <div className="h-4 w-40 rounded bg-sage/70" />
            <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-3">
                <div className="h-3 w-24 rounded bg-sage" />
                <div className="h-9 w-52 rounded bg-sage" />
                <div className="h-3 w-40 rounded bg-sage/70" />
              </div>
              <div className="ml-auto h-7 w-28 rounded-full bg-sage" />
            </div>
            <div className="mt-8 space-y-6">
              <div className="h-64 rounded-2xl bg-sage" />
              <div className="h-24 rounded-2xl bg-sage" />
              <div className="h-36 rounded-2xl bg-sage" />
            </div>
          </div>
        ) : (
          <div>
            <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Quotes', href: '/quotes' }, { label: quote.quoteNumber }]} />
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Quote request</p>
                <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark">{quote.quoteNumber}</h1>
                <p className="mt-2 text-sm text-muted">Requested {formatDate(quote.createdAt)}</p>
              </div>
              <QuoteStatusBadge status={quote.status} />
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
                <p className="mt-1 text-sm text-muted">Accepted {formatDate(quote.acceptedAt, true)}. Place your order to choose a payment method and pay.</p>
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

            <QuoteActionPanel
              status={quote.status}
              isConverted={isConverted}
              onAccept={() => { setActionError(null); setIsAcceptDialogOpen(true) }}
              onDecline={() => { setActionError(null); setIsDeclineDialogOpen(true) }}
              onPlaceOrder={goToCheckout}
            />
          </div>
        )}
      </main>
      <Footer />

      {isAcceptDialogOpen && quote && (
        <AcceptQuoteDialog
          quoteNumber={quote.quoteNumber}
          totalLabel={formatPrice(quote.quotedTotal ?? '0')}
          error={actionError}
          isBusy={isBusy}
          onCancel={() => { setActionError(null); setIsAcceptDialogOpen(false) }}
          onConfirm={() => void confirmAccept()}
        />
      )}

      {isDeclineDialogOpen && quote && (
        <DeclineQuoteDialog
          reason={declineReason}
          onChange={(value) => { setDeclineReason(value); setActionError(null) }}
          error={actionError}
          isBusy={isBusy}
          onCancel={closeDialogs}
          onConfirm={() => void confirmDecline()}
        />
      )}
    </>
  )
}