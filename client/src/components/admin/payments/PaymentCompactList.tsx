import { Link } from 'react-router-dom'
import type { AdminPayment } from '../../../services/paymentService'
import { ResponsiveDataTable } from '../../ui/ResponsiveDataTable'
import { formatPrice, formatRelativeDate, formatStatus, statusClass } from './paymentHelpers'
import { PaymentEmptyState } from './PaymentEmptyState'

const methodLabel = (paymentMethod: AdminPayment['paymentMethod']): string =>
  paymentMethod === 'PAYSTACK' ? 'Paystack' : 'Bank transfer'

function MethodBadge({ paymentMethod }: { paymentMethod: AdminPayment['paymentMethod'] }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${paymentMethod === 'PAYSTACK' ? 'bg-sage/60 text-green-dark' : 'bg-line/50 text-muted'}`}>
      {methodLabel(paymentMethod)}
    </span>
  )
}

interface PaymentCompactListProps {
  payments: AdminPayment[]
  onSelect: (payment: AdminPayment) => void
}

function MobileCardRows({ payments, onSelect }: PaymentCompactListProps) {
  return (
    <div className="space-y-3 p-4 lg:hidden">
      {payments.map((payment) => (
        <article className="rounded-2xl border border-line bg-cream/45 p-4" key={payment.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Order</p>
              <Link className="mt-1 block truncate font-bold text-green hover:text-orange" to={`/admin/orders/${payment.orderNumber}`}>{payment.orderNumber}</Link>
            </div>
            {formatStatus(payment.status) === 'Pending' && (
              <button className="shrink-0 font-bold text-green hover:text-orange" type="button" onClick={() => onSelect(payment)}>Review</button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-green-dark">{payment.customerName}</p>
              <p className="mt-1 truncate text-xs text-muted">{payment.customerEmail ?? payment.customerPhone}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-bold text-green-dark">{formatPrice(payment.amount)}</p>
              <p className="mt-1 text-xs text-muted">{formatRelativeDate(payment.createdAt)}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(payment.status)}`}>{formatStatus(payment.status)}</span>
            <MethodBadge paymentMethod={payment.paymentMethod} />
          </div>
        </article>
      ))}
    </div>
  )
}

function DesktopTable({ payments, onSelect }: PaymentCompactListProps) {
  return (
    <div className="hidden lg:block">
      <ResponsiveDataTable label="Payments table horizontal scroll">
        <table className="w-full min-w-[960px] whitespace-nowrap text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-line bg-sage/35 text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-5 py-4 font-bold">Order / customer</th>
              <th className="px-5 py-4 font-bold">Amount</th>
              <th className="px-5 py-4 font-bold">Method</th>
              <th className="px-5 py-4 font-bold">Status</th>
              <th className="px-5 py-4 font-bold">Submitted</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {payments.map((payment) => (
              <tr className="group cursor-pointer hover:bg-cream/60" key={payment.id} onClick={() => onSelect(payment)}>
                <td className="px-5 py-4">
                  <Link className="block min-w-0 truncate max-w-[180px] font-semibold text-green hover:text-orange" to={`/admin/orders/${payment.orderNumber}`} onClick={(event) => event.stopPropagation()}>{payment.orderNumber}</Link>
                  <p className="mt-1 block min-w-0 truncate max-w-[260px] text-xs text-muted">{payment.customerName} · {payment.customerEmail ?? payment.customerPhone}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <p className="font-semibold text-green-dark">{formatPrice(payment.amount)}</p>
                  <p className="mt-1 text-xs text-muted">Expected {formatPrice(payment.expectedAmount)}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-4"><MethodBadge paymentMethod={payment.paymentMethod} /></td>
                <td className="whitespace-nowrap px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(payment.status)}`}>{formatStatus(payment.status)}</span></td>
                <td className="whitespace-nowrap px-5 py-4 text-muted">{formatRelativeDate(payment.createdAt)}</td>
                <td className="px-5 py-4 text-right">
                  {formatStatus(payment.status) === 'Pending' && <span className="font-bold text-green hover:text-orange">Review</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResponsiveDataTable>
    </div>
  )
}

export function PaymentCompactList({ payments, onSelect }: PaymentCompactListProps) {
  if (payments.length === 0) {
    return <PaymentEmptyState message="No payments match these filters." />
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <MobileCardRows payments={payments} onSelect={onSelect} />
      <DesktopTable payments={payments} onSelect={onSelect} />
    </div>
  )
}