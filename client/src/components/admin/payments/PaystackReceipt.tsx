import type { AdminPayment } from '../../../services/paymentService'
import { formatDate } from '../../../utils/dateFormat'
import { formatPrice, statusClass } from './paymentHelpers'

interface PaystackReceiptProps {
  payment: AdminPayment
}

function ReceiptRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 ${mono ? 'break-all' : ''} font-bold text-green-dark`}>{value}</p>
    </div>
  )
}

export function PaystackReceipt({ payment }: PaystackReceiptProps) {
  return (
    <>
      <div className="mt-7 rounded-2xl border border-sage bg-sage/35 p-4 text-sm text-muted">
        This payment was confirmed automatically by Paystack. No review actions are required.
      </div>

      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <ReceiptRow label="Amount received" value={formatPrice(payment.amount)} />
        <ReceiptRow label="Expected order total" value={formatPrice(payment.expectedAmount)} />
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-muted">Status</p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(payment.status)}`}>Confirmed</span>
        </div>
        <ReceiptRow label="Paystack reference" value={payment.providerReference ?? 'Not provided'} mono />
        <ReceiptRow label="Payment channel" value={payment.channel ? payment.channel.charAt(0).toUpperCase() + payment.channel.slice(1) : 'Online'} />
        <ReceiptRow label="Paid" value={payment.paidAt ? formatDate(payment.paidAt, true) : formatDate(payment.createdAt, true)} />
      </div>
    </>
  )
}