export function VerifiedPurchaseBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-green/20 bg-green/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-green-dark">
      <svg aria-hidden="true" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      Verified Purchase
    </span>
  )
}