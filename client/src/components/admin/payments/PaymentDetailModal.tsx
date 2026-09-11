import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { AdminPayment, PaymentRejectionReason } from '../../../services/paymentService'
import { lockBodyScroll } from '../../../utils/browserCompatibility'
import { BankTransferReview } from './BankTransferReview'
import { PaystackReceipt } from './PaystackReceipt'

interface PaymentDetailModalProps {
  payment: AdminPayment
  isLoading?: boolean
  isSaving: boolean
  onClose: () => void
  onVerify: (note: string) => Promise<void>
  onReject: (reason: PaymentRejectionReason, note?: string) => Promise<void>
}

export function PaymentDetailModal({ payment, isLoading = false, isSaving, onClose, onVerify, onReject }: PaymentDetailModalProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose()
    }
    const releaseBodyScroll = lockBodyScroll()
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      releaseBodyScroll()
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isSaving, onClose])

  const isPaystack = payment.paymentMethod === 'PAYSTACK'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-green-dark/35 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-detail-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose()
      }}
    >
      <div className="y-scrollbar max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-cream p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">
              {isPaystack ? 'Payment receipt' : 'Payment review'}
            </p>
            <h2 id="payment-detail-title" className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">{payment.orderNumber}</h2>
            <Link className="mt-2 inline-block text-sm font-bold text-green hover:text-orange" to={`/admin/orders/${payment.orderNumber}`} onClick={onClose}>Open order details →</Link>
          </div>
          <button className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-muted hover:text-green-dark" type="button" onClick={onClose}>Close</button>
        </div>

        {isLoading
          ? <div className="mt-8 py-16 text-center text-sm text-muted">Loading payment details…</div>
          : (
            isPaystack
              ? <PaystackReceipt payment={payment} />
              : <BankTransferReview payment={payment} isSaving={isSaving} onVerify={onVerify} onReject={onReject} />
          )}
      </div>
    </div>
  )
}