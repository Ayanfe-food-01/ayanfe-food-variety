import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { ApiError } from '../services/api'
import { getCustomerOrder, type CreatedOrder } from '../services/orderService'
import { getBankDetails, submitPaymentProof, type BankDetails, type PaymentSubmission } from '../services/paymentService'

const formatPrice = (price: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(price))

export function CustomerPaymentProof() {
  const { orderNumber } = useParams()
  const { user, isLoading: isAuthLoading, openAuth } = useCustomerAuth()
  const [order, setOrder] = useState<CreatedOrder | null>(null)
  const [bank, setBank] = useState<BankDetails | null>(null)
  const [payment, setPayment] = useState<PaymentSubmission | CreatedOrder['paymentSubmissions'][number] | null>(null)
  const [senderName, setSenderName] = useState('')
  const [transactionReference, setTransactionReference] = useState('')
  const [amount, setAmount] = useState('')
  const [transferredAt, setTransferredAt] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isAuthLoading || !user || !orderNumber) return
    getCustomerOrder(orderNumber)
      .then((loadedOrder) => {
        setOrder(loadedOrder)
        setSenderName(loadedOrder.customerName)
        setAmount(loadedOrder.total)
        const latestSubmission = loadedOrder.paymentSubmissions[0]
        if (latestSubmission?.status === 'PENDING') setPayment(latestSubmission)
      })
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Payment instructions could not be loaded.'))
    getBankDetails()
      .then(setBank)
      .catch(() => {
        // Payment proof can still be prepared if settings are temporarily unavailable.
      })
  }, [isAuthLoading, orderNumber, user])

  const handleProofChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    if (!selected) {
      setProof(null)
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setProof(null)
      setError('Please select a JPG, PNG, or WEBP image.')
      return
    }
    if (selected.size > 5 * 1024 * 1024) {
      setProof(null)
      setError('Receipt images must be 5 MB or smaller.')
      return
    }
    setError(null)
    setProof(selected)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!order || !proof || !senderName.trim() || !transactionReference.trim() || !transferredAt) {
      setError('Complete all payment details and select a receipt image.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      setPayment(await submitPaymentProof({
        orderId: order.id,
        senderName: senderName.trim(),
        transactionReference: transactionReference.trim(),
        amount,
        transferredAt,
        proof,
      }))
    } catch (reason: unknown) {
      setError(reason instanceof ApiError ? reason.message : 'Payment proof could not be submitted.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="container py-12 sm:py-16 lg:py-24">
        {!isAuthLoading && !user ? (
          <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm">
            <h1 className="text-3xl font-bold text-green-dark">Sign in to submit payment proof</h1>
            <button className="mt-6 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="button" onClick={() => openAuth()}>
              Sign in or create an account
            </button>
          </div>
        ) : error && !order ? (
          <div className="rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">{error}</div>
        ) : !order ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted">Loading payment instructions…</p>
        ) : (
          <div className="mx-auto max-w-2xl">
            <Link className="text-sm font-bold text-green hover:text-orange" to={`/orders/${order.orderNumber}`}>← Back to order</Link>
            <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">I have made the transfer</p>
            <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark">Submit payment proof</h1>
            <p className="mt-4 text-sm leading-6 text-muted">Order {order.orderNumber} · Transfer exactly {formatPrice(order.total)}. Payment remains pending until reviewed.</p>
            <div className="mt-8 rounded-2xl border border-line bg-cream/60 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-green-dark">Current bank details</h2>
              {bank ? (
                <>
                  <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                    <div><dt className="text-muted">Bank name</dt><dd className="mt-1 font-bold text-green-dark">{bank.bankName}</dd></div>
                    <div><dt className="text-muted">Account name</dt><dd className="mt-1 font-bold text-green-dark">{bank.accountName}</dd></div>
                    <div><dt className="text-muted">Account number</dt><dd className="mt-1 font-bold text-green-dark">{bank.accountNumber}</dd></div>
                  </dl>
                  <p className="mt-5 border-t border-line pt-4 text-sm leading-6 text-muted">{bank.instructions}</p>
                </>
              ) : <p className="mt-4 text-sm text-muted">Bank details are loading…</p>}
            </div>
            {order.paymentStatus === 'PAID' ? (
              <div className="mt-6 rounded-2xl border border-green/25 bg-sage/25 p-6" role="status">
                <h2 className="font-bold text-green-dark">Payment confirmed</h2>
                <p className="mt-2 text-sm leading-6 text-muted">This order has already been paid. No further payment proof is needed.</p>
              </div>
            ) : payment ? (
              <div className="mt-6 rounded-2xl border border-green/25 bg-sage/25 p-6" role="status">
                <h2 className="font-bold text-green-dark">Payment verification pending</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Your payment submission is awaiting review. The order will only become paid after approval.</p>
              </div>
              ) : bank ? (
              <form className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8" onSubmit={handleSubmit}>
                <label className="block text-sm font-bold text-green-dark">Sender name<input className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-green" value={senderName} onChange={(event) => setSenderName(event.target.value)} required /></label>
                <label className="block text-sm font-bold text-green-dark">Transaction reference<input className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-green" value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} required /></label>
                <label className="block text-sm font-bold text-green-dark">Amount transferred<input className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-green" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
                <label className="block text-sm font-bold text-green-dark">Transfer date and time<input className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-green" type="datetime-local" value={transferredAt} onChange={(event) => setTransferredAt(event.target.value)} required /></label>
                <label className="block text-sm font-bold text-green-dark">Payment receipt or screenshot<input className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm file:mr-3 file:border-0 file:bg-sage file:px-3 file:py-1 file:font-bold" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProofChange} required /><span className="mt-1 block text-xs font-normal text-muted">JPG, PNG, or WEBP up to 5 MB.</span></label>
                {error && <p className="text-sm font-medium text-orange" role="alert">{error}</p>}
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green py-3.5 text-sm font-bold text-cream hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={isSubmitting || !proof}>
                  {isSubmitting ? 'Submitting receipt…' : 'Submit payment proof'} {!isSubmitting && <ArrowRight size={17} />}
                </button>
              </form>
              ) : (
                <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-6" role="alert">
                  <h2 className="font-bold text-orange">Payment details are not configured yet</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">Please contact the store before transferring funds. Payment proof submission is unavailable until valid bank details are available.</p>
                </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}