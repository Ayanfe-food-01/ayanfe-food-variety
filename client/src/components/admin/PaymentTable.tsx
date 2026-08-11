import type { AdminPayment } from '../../services/paymentService'

const formatPrice = (value: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value))

const formatDate = (value: string) => new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(new Date(value))

interface PaymentTableProps {
  payments: AdminPayment[]
  onSelect: (payment: AdminPayment) => void
}

export function PaymentTable({ payments, onSelect }: PaymentTableProps) {
  if (payments.length === 0) {
    return <div className="rounded-2xl border border-dashed border-line bg-white px-5 py-14 text-center text-sm text-muted">There are no pending payment submissions.</div>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-sage/35 text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-5 py-4 font-bold">Order</th>
              <th className="px-5 py-4 font-bold">Customer</th>
              <th className="px-5 py-4 font-bold">Amount</th>
              <th className="px-5 py-4 font-bold">Sender / reference</th>
              <th className="px-5 py-4 font-bold">Transfer date</th>
              <th className="px-5 py-4 font-bold">Status</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {payments.map((payment) => (
              <tr className="hover:bg-cream/60" key={payment.id}>
                <td className="px-5 py-4 font-semibold text-green-dark">#{payment.orderId.slice(0, 8)}</td>
                <td className="px-5 py-4">
                  <p className="m-0 font-semibold text-green-dark">{payment.customerName}</p>
                  <p className="mt-1 text-xs text-muted">{payment.customerEmail ?? 'No email'}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-4 font-semibold text-green-dark">{formatPrice(payment.amount)}</td>
                <td className="px-5 py-4">
                  <p className="m-0 font-semibold text-green-dark">{payment.senderName}</p>
                  <p className="mt-1 text-xs text-muted">{payment.transactionReference}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-muted">{formatDate(payment.transferredAt)}</td>
                <td className="px-5 py-4"><span className="rounded-full bg-sage px-2.5 py-1 text-xs font-bold text-green-dark">{payment.status}</span></td>
                <td className="px-5 py-4 text-right"><button className="font-bold text-green hover:text-orange" type="button" onClick={() => onSelect(payment)}>Review</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}