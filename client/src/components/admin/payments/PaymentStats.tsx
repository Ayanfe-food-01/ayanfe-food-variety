import type { ReactNode } from 'react'
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '../../../assets/icons'
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

interface SummaryCardProps {
  label: string
  count: number
  total: string
  icon: ReactNode
  iconClassName: string
  emphasis?: boolean
  footer?: ReactNode
}

function SummaryCard({ label, count, total, icon, iconClassName, emphasis, footer }: SummaryCardProps) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${emphasis ? 'border-orange/30 bg-orange/5' : 'border-line bg-white'}`}>
      <div className="flex items-center gap-2">
        <span className={`shrink-0 ${iconClassName}`}>{icon}</span>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-green-dark">{count}</p>
      <p className="mt-1 text-xs text-muted">{formatPrice(total)} submitted</p>
      {footer}
    </div>
  )
}

export function PaymentStats({ pending, verified, rejected, methodBreakdown }: PaymentStatsProps) {
  const confirmedFooter = methodBreakdown && (
    <div className="mt-3 border-t border-line pt-3">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-orange/10 px-2.5 py-1 text-[11px] font-bold text-orange">Paystack {formatPrice(methodBreakdown.paystack.totalAmount)}</span>
        <span className="rounded-full bg-line/50 px-2.5 py-1 text-[11px] font-bold text-muted">Bank {formatPrice(methodBreakdown.bankTransfer.totalAmount)}</span>
      </div>
    </div>
  )

  return (
    <section className="mt-8" aria-label="Payment verification overview">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Pending verification" count={pending.count} total={pending.totalAmount} icon={<ClockIcon size={15} />} iconClassName="text-orange" emphasis />
        <SummaryCard label="Confirmed" count={verified.count} total={verified.totalAmount} icon={<CheckCircleIcon size={15} />} iconClassName="text-green" footer={confirmedFooter} />
        <SummaryCard label="Rejected" count={rejected.count} total={rejected.totalAmount} icon={<XCircleIcon size={15} />} iconClassName="text-orange" />
      </div>
    </section>
  )
}