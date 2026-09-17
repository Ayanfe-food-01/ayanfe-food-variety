import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Footer } from '../../components/layout/Footer'
import { Navbar } from '../../components/layout/Navbar'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import { PaymentMethodSection } from '../../components/checkout/CheckoutFormSections'
import { checkoutSectionClassName } from '../../components/checkout/checkoutStyles'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
import { ApiError } from '../../services/api'
import type { PaymentMethod } from '../../services/orderService'
import {
  convertQuoteToOrder,
  getCustomerQuoteRequest,
  type QuoteRequest,
} from '../../services/quoteService'
import { initializePaystackPayment } from '../../services/paymentService'
import { formatDate } from '../../utils/dateFormat'
import { formatPrice } from '../../utils/formatPrice'
import { QuoteCheckoutDeliveryForm } from './QuoteCheckoutDeliveryForm'
import { QuoteTotalsCard } from './QuoteTotalsCard'
import { useQuotePaymentMethods } from './useQuotePaymentMethods'

const GUARDED_MESSAGES: Record<string, { title: string; body: string; action?: { label: string; to: string } }> = {
  QUOTED: {
    title: 'Accept the quotation first',
    body: 'This quotation is ready for you. Accept it, then come back here to place your order.',
    action: { label: 'View quotation', to: '' },
  },
  PENDING: {
    title: 'Quotation not ready yet',
    body: 'The store is still reviewing your request. Check back once a price has been quoted.',
    action: { label: 'View quotation', to: '' },
  },
  CONTACTED: {
    title: 'Quotation not ready yet',
    body: 'The store has been in touch. Wait for your quotation, then you can place your order.',
    action: { label: 'View quotation', to: '' },
  },
  CANCELLED: {
    title: 'Quotation declined',
    body: 'This quotation was declined and can no longer be converted into an order.',
    action: { label: 'View quotation', to: '' },
  },
}

export function QuoteCheckout() {
  const { reference } = useParams()
  const navigate = useNavigate()
  const { user, isLoading: isAuthLoading, openAuth } = useCustomerAuth()
  const [quote, setQuote] = useState<QuoteRequest | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [instructions, setInstructions] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER')
  const [pageError, setPageError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useInitialRouteLoad(!isAuthLoading && (!user || !!quote || !!loadError))
  const { paymentMethods, isPaymentLoading, paymentError } = useQuotePaymentMethods(setPaymentMethod)

  useEffect(() => {
    if (isAuthLoading || !user || !reference) return
    let active = true
    getCustomerQuoteRequest(reference)
      .then((result) => {
        if (active) setQuote(result)
      })
      .catch((reason: unknown) => {
        if (active) setLoadError(reason instanceof ApiError ? reason.message : 'Quotation could not be loaded.')
      })
    return () => { active = false }
  }, [isAuthLoading, reference, user])

  const isDelivery = quote?.fulfillmentMethod === 'DELIVERY'
  const isConverted = quote?.status === 'COMPLETED' && quote.convertedOrderNumber !== null
  const canPlaceOrder = quote?.status === 'ACCEPTED' && !isConverted
  const selectedSettings = paymentMethods.find((method) => method.paymentMethod === paymentMethod) ?? null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!reference || !quote) return
    const trimmedAddress = address.trim()
    const trimmedCity = city.trim()
    if (isDelivery && (!trimmedAddress || !trimmedCity)) {
      setPageError('A delivery address and city are required for delivery orders.')
      return
    }
    setIsSubmitting(true)
    setPageError(null)
    try {
      const order = await convertQuoteToOrder(reference, {
        deliveryAddress: isDelivery ? trimmedAddress : undefined,
        city: isDelivery ? trimmedCity : undefined,
        deliveryInstructions: instructions.trim() || undefined,
        paymentMethod,
      })
      if (paymentMethod === 'PAYSTACK') {
        const callbackUrl = `${window.location.origin}/order-confirmation/${encodeURIComponent(order.orderNumber)}`
        const payment = await initializePaystackPayment({ orderId: order.id, callbackUrl })
        window.location.assign(payment.authorizationUrl)
        return
      }
      navigate(`/order-confirmation/${encodeURIComponent(order.orderNumber)}`, { replace: true })
    } catch (caught: unknown) {
      setPageError(caught instanceof ApiError ? caught.message : 'We couldn’t place your order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="container py-10 sm:py-14">
        {!isAuthLoading && !user ? (
          <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm">
            <h1 className="text-3xl font-bold text-green-dark">Sign in to place your order</h1>
            <p className="mt-3 text-sm leading-6 text-muted">You need a verified account to convert this quotation into an order.</p>
            <button className="mt-6 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="button" onClick={() => openAuth()}>
              Continue to sign in
            </button>
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">{loadError}</div>
        ) : !quote ? (
          <div className="animate-pulse" role="status" aria-label="Loading quotation">
            <div className="h-4 w-40 rounded bg-sage/70" />
            <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-6">
                <div className="h-8 w-64 rounded bg-sage" />
                <div className="h-56 rounded-2xl bg-sage" />
                <div className="h-56 rounded-2xl bg-sage" />
              </div>
              <div className="h-96 rounded-2xl bg-sage" />
            </div>
          </div>
        ) : !canPlaceOrder ? (
          <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm">
            <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Quotes', href: '/quotes' }, { label: quote.quoteNumber }]} />
            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Checkout</p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.05em] text-green-dark sm:text-4xl">
              {GUARDED_MESSAGES[quote.status]?.title ?? (isConverted ? 'Already converted' : 'Not available')}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
              {isConverted && quote.convertedOrderNumber
                ? `This quotation was already converted into order ${quote.convertedOrderNumber}.`
                : GUARDED_MESSAGES[quote.status]?.body}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {isConverted && quote.convertedOrderNumber ? (
                <Link className="rounded-full bg-green px-6 py-3 text-sm font-bold text-cream hover:bg-green-dark" to={`/order-confirmation/${quote.convertedOrderNumber}`}>
                  View order
                </Link>
              ) : (
                <Link className="rounded-full bg-green px-6 py-3 text-sm font-bold text-cream hover:bg-green-dark" to={`/quotes/${quote.quoteNumber}`}>
                  View quotation
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div>
            <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Quotes', href: '/quotes' }, { label: quote.quoteNumber }, { label: 'Checkout' }]} />
            <div className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Accepted quotation checkout</p>
              <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark">Place your order</h1>
              <p className="mt-2 text-sm text-muted">
                Quote {quote.quoteNumber} · accepted {quote.acceptedAt ? formatDate(quote.acceptedAt, true) : '—'} · total{' '}
                <strong className="font-bold text-green-dark">{quote.quotedTotal !== null ? formatPrice(quote.quotedTotal) : '—'}</strong>
              </p>
            </div>

            <form className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16" onSubmit={handleSubmit} noValidate>
              <div className="min-w-0">
                {isDelivery && (
                  <QuoteCheckoutDeliveryForm
                    address={address}
                    city={city}
                    instructions={instructions}
                    error={pageError}
                    onChangeAddress={(value) => { setAddress(value); setPageError(null) }}
                    onChangeCity={(value) => { setCity(value); setPageError(null) }}
                    onChangeInstructions={setInstructions}
                  />
                )}

                <section className={checkoutSectionClassName}>
                  <PaymentMethodSection
                    methods={paymentMethods}
                    selectedMethod={paymentMethod}
                    selectedSettings={selectedSettings}
                    isLoading={isPaymentLoading}
                    error={paymentError}
                    onChange={setPaymentMethod}
                  />
                </section>

                <div className="mt-10">
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green py-4 text-sm font-bold text-cream shadow-lg shadow-green/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-dark focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    type="submit"
                    disabled={isSubmitting || isPaymentLoading || !selectedSettings}
                  >
                    {isSubmitting ? 'Placing your order…' : `Place order (${formatPrice(quote.quotedTotal ?? '0')})`}
                  </button>
                  {pageError && <p className="mt-3 text-center text-sm font-medium text-orange" role="alert">{pageError}</p>}
                </div>
              </div>

              <QuoteTotalsCard quote={quote} />
            </form>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}