import { Link } from 'react-router-dom'
import type { AdminPayment } from '../../services/paymentService'

const formatPrice = (value: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value))

const formatDate = (value: string, includeTime = false) =>
  new Intl.DateTimeFormat('en-NG', includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(new Date(value))

const statusClass = (status: AdminPayment['status']) =>
  status === 'VERIFIED' ? 'bg-green/10 text-green' : status === 'REJECTED' ? 'bg-orange/10 text-orange' : 'bg-sage text-green-dark'

interface PaymentTableProps {
  payments: AdminPayment[]
  onSelect: (payment: AdminPayment) => void
}

function ProofBadge({ payment }: { payment: AdminPayment }) {
  return payment.proofAvailable
    ? <span className="rounded-full bg-green/10 px-2.5 py-1 text-[11px] font-bold text-green">Available</span>
    : <span className="rounded-full bg-orange/10 px-2.5 py-1 text-[11px] font-bold text-orange">Missing</span>
}

export function PaymentTable({ payments, onSelect }: PaymentTableProps) {
  if (payments.length === 0) {
    return <div className="rounded-2xl border border-dashed border-line bg-white px-5 py-14 text-center text-sm text-muted">No payment submissions match these filters.</div>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="space-y-3 p-4 md:hidden">
        {payments.map((payment) => (
          <article className="rounded-2xl border border-line bg-cream/45 p-4" key={payment.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Order</p>
                <Link className="mt-1 block font-bold text-green hover:text-orange" to={`/admin/orders/${payment.orderNumber}`}>{payment.orderNumber}</Link>
              </div>
              <button className="shrink-0 font-bold text-green hover:text-orange" type="button" onClick={() => onSelect(payment)}>Review</button>
            </div>
            <div className="mt-4">
              <p className="font-semibold text-green-dark">{payment.customerName}</p>
              <p className="mt-1 break-words text-xs text-muted">{payment.customerEmail ?? payment.customerPhone}</p>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 text-xs">
              <div><dt className="uppercase tracking-[0.12em] text-muted">Expected total</dt><dd className="mt-1 font-bold text-green-dark">{formatPrice(payment.expectedAmount)}</dd></div>
              <div><dt className="uppercase tracking-[0.12em] text-muted">Submitted amount</dt><dd className="mt-1 font-bold text-green-dark">{formatPrice(payment.amount)}</dd></div>
              <div><dt className="uppercase tracking-[0.12em] text-muted">Method</dt><dd className="mt-1 text-muted">Bank transfer</dd></div>
              <div><dt className="uppercase tracking-[0.12em] text-muted">Proof</dt><dd className="mt-1"><ProofBadge payment={payment} /></dd></div>
              <div><dt className="uppercase tracking-[0.12em] text-muted">Submitted</dt><dd className="mt-1 text-muted">{formatDate(payment.createdAt, true)}</dd></div>
              <div><dt className="uppercase tracking-[0.12em] text-muted">Status</dt><dd className="mt-1"><span className={`rounded-full px-2.5 py-1 font-bold ${statusClass(payment.status)}`}>{payment.status}</span></dd></div>
              {payment.reviewedAt && <div className="col-span-2"><dt className="uppercase tracking-[0.12em] text-muted">Reviewed</dt><dd className="mt-1 text-muted">{formatDate(payment.reviewedAt, true)}</dd></div>}
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b border-line bg-sage/35 text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-5 py-4 font-bold">Order / customer</th>
              <th className="px-5 py-4 font-bold">Amount</th>
              <th className="px-5 py-4 font-bold">Method</th>
              <th className="px-5 py-4 font-bold">Proof</th>
              <th className="px-5 py-4 font-bold">Submitted</th>
              <th className="px-5 py-4 font-bold">Status</th>
              <th className="px-5 py-4 font-bold">Reviewed</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {payments.map((payment) => (
              <tr className="hover:bg-cream/60" key={payment.id}>
                <td className="px-5 py-4">
                  <Link className="font-semibold text-green hover:text-orange" to={`/admin/orders/${payment.orderNumber}`}>{payment.orderNumber}</Link>
                  <p className="mt-1 text-xs text-muted">{payment.customerName} · {payment.customerEmail ?? payment.customerPhone}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <p className="font-semibold text-green-dark">{formatPrice(payment.amount)}</p>
                  <p className="mt-1 text-xs text-muted">Expected {formatPrice(payment.expectedAmount)}</p>
                </td>
                <td className="px-5 py-4 text-muted">Bank transfer</td>
                <td className="px-5 py-4"><ProofBadge payment={payment} /></td>
                <td className="whitespace-nowrap px-5 py-4 text-muted">{formatDate(payment.createdAt, true)}</td>
                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(payment.status)}`}>{payment.status}</span></td>
                <td className="whitespace-nowrap px-5 py-4 text-muted">{payment.reviewedAt ? formatDate(payment.reviewedAt, true) : '—'}</td>
                <td className="px-5 py-4 text-right"><button className="font-bold text-green hover:text-orange" type="button" onClick={() => onSelect(payment)}>Review</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}