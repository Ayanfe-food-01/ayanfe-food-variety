import { formatPrice } from './paymentHelpers'

export interface PaymentSummaryItem {
  count: number
  totalAmount: string
}

export interface PaymentMethodBreakdown {
  paystack: PaymentSummaryItem
  bankTransfer: PaymentSummaryItem
}

interface PaymentStatsProps {
  pending: PaymentSummaryItem
  verified: PaymentSummaryItem
  rejected: PaymentSummaryItem
  methodBreakdown?: PaymentMethodBreakdown
}

function SummaryCard({ label, count, total, emphasis }: { label: string; count: number; total: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${emphasis ? 'border-orange/30 bg-orange/5' : 'border-line bg-white'}`}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-green-dark">{count}</p>
      <p className="mt-1 text-xs text-muted">{formatPrice(total)} submitted</p>
    </div>
  )
}

function MethodBreakdownLine({ breakdown }: { breakdown: PaymentMethodBreakdown }) {
  return (
    <p className="mt-3 text-right text-xs text-muted">
      {formatPrice(breakdown.paystack.totalAmount)} via Paystack · {formatPrice(breakdown.bankTransfer.totalAmount)} via bank transfer
    </p>
  )
}

export function PaymentStats({ pending, verified, rejected, methodBreakdown }: PaymentStatsProps) {
  return (
    <section className="mt-8" aria-label="Payment verification overview">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Pending verification" count={pending.count} total={pending.totalAmount} emphasis />
        <SummaryCard label="Confirmed" count={verified.count} total={verified.totalAmount} />
        <SummaryCard label="Rejected" count={rejected.count} total={rejected.totalAmount} />
      </div>
      {methodBreakdown && <MethodBreakdownLine breakdown={methodBreakdown} />}
    </section>
  )
}