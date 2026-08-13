import { useState } from 'react'
import type { AdminPayment } from '../../services/paymentService'
import { ImagePreview } from '../ui/ImagePreview'

const formatPrice = (value: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value))

interface PaymentReviewProps {
  payment: AdminPayment
  isSaving: boolean
  onClose: () => void
  onVerify: (note: string) => Promise<void>
  onReject: (note: string) => Promise<void>
}

export function PaymentReview({ payment, isSaving, onClose, onVerify, onReject }: PaymentReviewProps) {
  const [note, setNote] = useState(payment.reviewNote ?? '')
  const [error, setError] = useState<string | null>(null)

  const reject = async () => {
    if (!note.trim()) {
      setError('Add a review note before rejecting this payment.')
      return
    }
    setError(null)
    await onReject(note.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-green-dark/35 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="payment-review-title">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-cream p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Payment review</p>
            <h2 id="payment-review-title" className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">Order #{payment.orderId.slice(0, 8)}</h2>
          </div>
          <button className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-muted hover:text-green-dark" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="mt-7 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-4"><p className="text-xs text-muted">Customer</p><p className="mt-1 font-bold text-green-dark">{payment.customerName}</p><p className="mt-1 text-xs text-muted">{payment.customerEmail ?? 'No email provided'}</p></div>
          <div className="rounded-2xl bg-white p-4"><p className="text-xs text-muted">Amount</p><p className="mt-1 text-lg font-bold text-green-dark">{formatPrice(payment.amount)}</p></div>
          <div className="rounded-2xl bg-white p-4"><p className="text-xs text-muted">Sender name</p><p className="mt-1 font-bold text-green-dark">{payment.senderName}</p></div>
          <div className="rounded-2xl bg-white p-4"><p className="text-xs text-muted">Transaction reference</p><p className="mt-1 break-all font-bold text-green-dark">{payment.transactionReference}</p></div>
          <div className="rounded-2xl bg-white p-4"><p className="text-xs text-muted">Transfer date</p><p className="mt-1 font-bold text-green-dark">{new Date(payment.transferredAt).toLocaleString('en-NG')}</p></div>
          <div className="rounded-2xl bg-white p-4"><p className="text-xs text-muted">Submitted date</p><p className="mt-1 font-bold text-green-dark">{new Date(payment.createdAt).toLocaleString('en-NG')}</p></div>
          <div className="rounded-2xl bg-white p-4"><p className="text-xs text-muted">Payment status</p><p className="mt-1 font-bold text-green-dark">{payment.status}</p></div>
        </div>

        <ImagePreview
          className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-green/20 bg-sage/35 px-4 py-4 text-sm font-bold text-green hover:bg-sage"
          src={payment.proofUrl}
          alt={`Payment proof for ${payment.transactionReference}`}
          label="View receipt / payment proof"
        />

        <label className="mt-6 block text-sm font-bold text-green-dark">
          Review note
          <textarea className="mt-2 min-h-24 w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional for verification; required for rejection." />
        </label>
        {error && <p className="mt-2 text-sm font-medium text-orange" role="alert">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="rounded-xl border border-orange/30 px-5 py-3 text-sm font-bold text-orange hover:bg-orange/5 disabled:opacity-50" type="button" disabled={isSaving} onClick={() => void reject()}>Reject payment</button>
          <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:opacity-50" type="button" disabled={isSaving} onClick={() => void onVerify(note.trim())}>{isSaving ? 'Saving review…' : 'Verify payment'}</button>
        </div>
      </div>
    </div>
  )
}