import { useState } from 'react'
import type { AdminPayment, PaymentRejectionReason } from '../../../services/paymentService'
import { ImagePreview } from '../../ui/ImagePreview'
import { formatDate } from '../../../utils/dateFormat'
import { formatPrice, formatStatus, isActionable, statusClass } from './paymentHelpers'

const rejectionReasons: Array<{ value: PaymentRejectionReason; label: string }> = [
  { value: 'AMOUNT_MISMATCH', label: 'Amount does not match' },
  { value: 'PROOF_UNCLEAR', label: 'Proof is unclear' },
  { value: 'TRANSACTION_UNVERIFIED', label: 'Transaction could not be verified' },
  { value: 'WRONG_ACCOUNT', label: 'Wrong account' },
  { value: 'DUPLICATE_PROOF', label: 'Duplicate proof' },
  { value: 'OTHER', label: 'Other' },
]

const rejectionReasonLabel = (value: PaymentRejectionReason): string =>
  rejectionReasons.find((reason) => reason.value === value)?.label ?? value.replace(/_/g, ' ')

const auditActionLabel = (value: string): string =>
  value === 'PROOF_SUBMITTED'
    ? 'Proof submitted'
    : value === 'PAYMENT_CONFIRMED'
      ? 'Payment confirmed'
      : value === 'PAYMENT_REJECTED'
        ? 'Payment rejected'
        : value.replace(/_/g, ' ')

interface BankTransferReviewProps {
  payment: AdminPayment
  isSaving: boolean
  onVerify: (note: string) => Promise<void>
  onReject: (reason: PaymentRejectionReason, note?: string) => Promise<void>
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  )
}

export function BankTransferReview({ payment, isSaving, onVerify, onReject }: BankTransferReviewProps) {
  const [note, setNote] = useState(payment.reviewNote ?? '')
  const [rejectionReason, setRejectionReason] = useState<PaymentRejectionReason | ''>(payment.rejectionReason ?? '')
  const [error, setError] = useState<string | null>(null)
  const isPending = isActionable(payment.status)
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
    <>
      <div className="mt-7 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label="Customer">
          <p className="font-bold text-green-dark">{payment.customerName}</p>
          <p className="mt-1 break-words text-xs text-muted">{payment.customerEmail ?? payment.customerPhone}</p>
        </InfoCard>
        <InfoCard label="Expected order total">
          <p className="text-lg font-bold text-green-dark">{formatPrice(payment.expectedAmount)}</p>
        </InfoCard>
        <InfoCard label="Payment method">
          <p className="font-bold text-green-dark">Bank transfer</p>
        </InfoCard>
        <div className={`rounded-2xl p-4 ${amountMatches ? 'bg-sage/45' : 'bg-orange/10'}`}>
          <p className="text-xs text-muted">Amount entered with proof</p>
          <p className="mt-1 text-lg font-bold text-green-dark">{formatPrice(payment.amount)}</p>
          <p className="mt-1 text-xs text-muted">Customer-provided amount; verify against your bank records.</p>
        </div>
        <InfoCard label="Sender name">
          <p className="font-bold text-green-dark">{payment.senderName}</p>
        </InfoCard>
        <InfoCard label="Transaction reference">
          <p className={`break-all font-bold ${payment.transactionReference ? 'text-green-dark' : 'text-muted'}`}>
            {payment.transactionReference || 'Not provided — verify using the uploaded proof'}
          </p>
        </InfoCard>
        <InfoCard label="Submitted">
          <p className="font-bold text-green-dark">{formatDate(payment.createdAt, true)}</p>
        </InfoCard>
        <InfoCard label="Transfer date">
          <p className="font-bold text-green-dark">{payment.transferredAt ? formatDate(payment.transferredAt, true) : '—'}</p>
        </InfoCard>
        <InfoCard label="Current status">
          <p className="font-bold text-green-dark">{formatStatus(payment.status)} · Order payment {payment.orderPaymentStatus}</p>
          {payment.reviewedAt && <p className="mt-1 text-xs text-muted">Reviewed {formatDate(payment.reviewedAt, true)}</p>}
        </InfoCard>
      </div>

      {payment.rejectionReason && (
        <section className="mt-6 rounded-2xl border border-orange/25 bg-orange/10 p-5" aria-label="Rejection details">
          <h3 className="font-bold text-orange">Rejection details</h3>
          <p className="mt-2 text-sm font-semibold text-green-dark">{rejectionReasonLabel(payment.rejectionReason)}</p>
          {payment.reviewNote && <p className="mt-1 text-sm leading-6 text-muted">{payment.reviewNote}</p>}
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-green-dark">Payment proof</h3>
            <p className="mt-1 text-sm text-muted">The uploaded image is the primary customer-provided proof for review; verify it against your bank records.</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(payment.status)}`}>{formatStatus(payment.status)}</span>
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
                <p className="font-bold text-green-dark">{auditActionLabel(event.action)}</p>
                <p className="mt-1 text-xs text-muted">{formatDate(event.createdAt, true)} · {event.performedBy?.name ?? 'System'}</p>
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
            <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:opacity-50" type="button" disabled={isSaving} onClick={() => void onVerify(note.trim())}>{isSaving ? 'Saving…' : 'Confirm payment'}</button>
          </div>
        </>
      ) : (
        <p className="mt-6 rounded-xl bg-sage/35 p-4 text-sm text-muted">This payment has already been processed. Review actions are disabled to prevent duplicate transitions.</p>
      )}
    </>
  )
}