import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { AdminPayment, PaymentRejectionReason } from '../../services/paymentService'
import { ImagePreview } from '../ui/ImagePreview'

const formatPrice = (value: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value))

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

const rejectionReasons: Array<{ value: PaymentRejectionReason; label: string }> = [
  { value: 'AMOUNT_MISMATCH', label: 'Amount does not match' },
  { value: 'PROOF_UNCLEAR', label: 'Proof is unclear' },
  { value: 'TRANSACTION_UNVERIFIED', label: 'Transaction could not be verified' },
  { value: 'WRONG_ACCOUNT', label: 'Wrong account' },
  { value: 'DUPLICATE_PROOF', label: 'Duplicate proof' },
  { value: 'OTHER', label: 'Other' },
]

interface PaymentReviewProps {
  payment: AdminPayment
  isSaving: boolean
  onClose: () => void
  onVerify: (note: string) => Promise<void>
  onReject: (reason: PaymentRejectionReason, note?: string) => Promise<void>
}

export function PaymentReview({ payment, isSaving, onClose, onVerify, onReject }: PaymentReviewProps) {
  const [note, setNote] = useState(payment.reviewNote ?? '')
  const [rejectionReason, setRejectionReason] = useState<PaymentRejectionReason | ''>(payment.rejectionReason ?? '')
  const [error, setError] = useState<string | null>(null)
  const isPending = payment.status === 'PENDING'
  const amountMatches = payment.amount === payment.expectedAmount

  const reject = async () => {
    if (!rejectionReason) {
      setError('Select a rejection reason before rejecting this payment.')
      return
    }
    setError(null)
    await onReject(rejectionReason, note.trim() || undefined)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-green-dark/35 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="payment-review-title">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-cream p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Payment review</p>
            <h2 id="payment-review-title" className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">{payment.orderNumber}</h2>
            <Link className="mt-2 inline-block text-sm font-bold text-green hover:text-orange" to={`/admin/orders/${payment.orderNumber}`} onClick={onClose}>Open order details →</Link>
          </div>
          <button className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-muted hover:text-green-dark" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="mt-7 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-4"><p className="text-xs text-muted">Customer</p><p className="mt-1 font-bold text-green-dark">{payment.customerName}</p><p className="mt-1 break-words text-xs text-muted">{payment.customerEmail ?? payment.customerPhone}</p></div>
          <div className="rounded-2xl bg-white p-4"><p className="text-xs text-muted">Expected order total</p><p className="mt-1 text-lg font-bold text-green-dark">{formatPrice(payment.expectedAmount)}</p></div>
          <div className="rounded-2xl bg-white p-4"><p className="text-xs text-muted">Payment method</p><p className="mt-1 font-bold text-green-dark">Bank transfer</p></div>
          <div className={`rounded-2xl p-4 ${amountMatches ? 'bg-sage/45' : 'bg-orange/10'}`}><p className="text-xs text-muted">Amount entered with proof</p><p className="mt-1 text-lg font-bold text-green-dark">{formatPrice(payment.amount)}</p><p className="mt-1 text-xs text-muted">Customer-provided amount; verify against your bank records.</p></div>
          <div className="rounded-2xl bg-white p-4"><p className="text-xs text-muted">Sender name</p><p className="mt-1 font-bold text-green-dark">{payment.senderName}</p></div>
          <div className="rounded-2xl bg-white p-4"><p className="text-xs text-muted">Transaction reference</p><p className="mt-1 break-all font-bold text-green-dark">{payment.transactionReference}</p></div>
          <div className="rounded-2xl bg-white p-4"><p className="text-xs text-muted">Submitted</p><p className="mt-1 font-bold text-green-dark">{formatDate(payment.createdAt)}</p></div>
          <div className="rounded-2xl bg-white p-4"><p className="text-xs text-muted">Transfer date</p><p className="mt-1 font-bold text-green-dark">{formatDate(payment.transferredAt)}</p></div>
          <div className="rounded-2xl bg-white p-4"><p className="text-xs text-muted">Current status</p><p className="mt-1 font-bold text-green-dark">{payment.status} · Order payment {payment.orderPaymentStatus}</p></div>
        </div>

        <section className="mt-6 rounded-2xl border border-line bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-bold text-green-dark">Payment proof</h3><p className="mt-1 text-sm text-muted">An uploaded image is evidence for review only; it does not prove funds were received.</p></div>
            {payment.proofAvailable && <span className="text-xs font-bold text-green">Uploaded {formatDate(payment.createdAt)}</span>}
          </div>
          {payment.proofAvailable ? (
            <ImagePreview className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-green/20 bg-sage/35 px-4 py-4 text-sm font-bold text-green hover:bg-sage" src={payment.proofUrl} alt={`Payment proof for ${payment.orderNumber}`} label="View full payment proof" />
          ) : (
            <p className="mt-4 rounded-xl bg-orange/10 p-4 text-sm text-orange">No payment proof image is available for this submission.</p>
          )}
        </section>

        {payment.auditHistory && payment.auditHistory.length > 0 && (
          <section className="mt-6 rounded-2xl border border-line bg-white p-5">
            <h3 className="font-bold text-green-dark">Audit history</h3>
            <div className="mt-4 space-y-3">
              {payment.auditHistory.map((event) => (
                <div className="border-l-2 border-sage pl-4 text-sm" key={event.id}>
                  <p className="font-bold text-green-dark">{event.action.replaceAll('_', ' ')}</p>
                  <p className="mt-1 text-xs text-muted">{formatDate(event.createdAt)} · {event.performedBy?.name ?? 'System'}</p>
                  {event.note && <p className="mt-1 text-xs text-muted">{event.note}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {isPending ? (
          <>
            <label className="mt-6 block text-sm font-bold text-green-dark">
              Rejection reason
              <select className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value as PaymentRejectionReason | '')}>
                <option value="">Select a reason when rejecting</option>
                {rejectionReasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-sm font-bold text-green-dark">
              Optional explanation
              <textarea className="mt-2 min-h-24 w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder="Add context for the customer or future reviewers." />
            </label>
            {error && <p className="mt-2 text-sm font-medium text-orange" role="alert">{error}</p>}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="rounded-xl border border-orange/30 px-5 py-3 text-sm font-bold text-orange hover:bg-orange/5 disabled:opacity-50" type="button" disabled={isSaving} onClick={() => void reject()}>Reject payment</button>
              <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:opacity-50" type="button" disabled={isSaving} onClick={() => void onVerify(note.trim())}>{isSaving ? 'Saving review…' : 'Confirm payment'}</button>
            </div>
          </>
        ) : (
          <p className="mt-6 rounded-xl bg-sage/35 p-4 text-sm text-muted">This payment has already been processed. Review actions are disabled to prevent duplicate transitions.</p>
        )}
      </div>
    </div>
  )
}