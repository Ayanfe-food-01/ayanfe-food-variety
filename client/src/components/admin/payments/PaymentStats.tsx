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
  isLoading?: boolean
}

interface SummaryCardProps {
  label: string
  count: number
  total: string
  icon: ReactNode
  iconClassName: string
  footer?: ReactNode
  isLoading?: boolean
}

function SummaryCard({ label, count, total, icon, iconClassName, footer, isLoading }: SummaryCardProps) {
  return (
    <div className="flex h-full min-h-[9.5rem] flex-col rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`shrink-0 ${iconClassName}`}>{icon}</span>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      </div>
      {isLoading ? (
        <>
          <span className="mt-4 block h-9 w-20 animate-pulse rounded-md bg-sage/70" aria-hidden="true" />
          <span className="mt-2 block h-4 w-32 animate-pulse rounded bg-sage/70" aria-hidden="true" />
        </>
      ) : (
        <>
          <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-green-dark">{count}</p>
          <p className="mt-1 text-xs text-muted">{formatPrice(total)} submitted</p>
        </>
      )}
      {footer && <div className="mt-auto pt-3">{footer}</div>}
    </div>
  )
}

export function PaymentStats({ pending, verified, rejected, methodBreakdown, isLoading = false }: PaymentStatsProps) {
  const confirmedFooter = methodBreakdown && (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-orange/10 px-2.5 py-1 text-[11px] font-bold text-orange">Paystack {formatPrice(methodBreakdown.paystack.totalAmount)}</span>
      <span className="rounded-full bg-line/50 px-2.5 py-1 text-[11px] font-bold text-muted">Bank {formatPrice(methodBreakdown.bankTransfer.totalAmount)}</span>
    </div>
  )

  return (
    <section className="mt-8" aria-label="Payment verification overview">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Pending verification" count={pending.count} total={pending.totalAmount} icon={<ClockIcon size={15} />} iconClassName="text-orange" footer={isLoading ? undefined : <span className="inline-flex rounded-full bg-orange/10 px-2.5 py-1 text-[11px] font-bold text-orange">Awaiting manual review</span>} isLoading={isLoading} />
        <SummaryCard label="Confirmed" count={verified.count} total={verified.totalAmount} icon={<CheckCircleIcon size={15} />} iconClassName="text-green" footer={isLoading ? undefined : confirmedFooter} isLoading={isLoading} />
        <SummaryCard label="Rejected" count={rejected.count} total={rejected.totalAmount} icon={<XCircleIcon size={15} />} iconClassName="text-orange" footer={isLoading ? undefined : <span className="inline-flex rounded-full bg-line/50 px-2.5 py-1 text-[11px] font-bold text-muted">Awaiting customer re-submission</span>} isLoading={isLoading} />
      </div>
    </section>
  )
}