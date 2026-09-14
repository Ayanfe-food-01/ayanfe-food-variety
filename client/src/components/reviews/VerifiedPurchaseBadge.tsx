import { CheckCircleIcon } from '../../assets/icons'

export function VerifiedPurchaseBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-green">
      <CheckCircleIcon size={13} className="shrink-0 text-green" />
      Verified Purchase
    </span>
  )
}