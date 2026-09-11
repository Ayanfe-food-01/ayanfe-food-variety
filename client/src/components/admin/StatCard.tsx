import { Link } from 'react-router-dom'

interface StatCardProps {
  label: string
  value: string | number
  detail: string
  accent?: 'green' | 'orange'
  isLoading?: boolean
  to?: string
}

export function StatCard({ label, value, detail, accent = 'green', isLoading = false, to }: StatCardProps) {
  const card = (
    <article className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
      <div className={`mb-7 size-2.5 rounded-full sm:mb-8 ${accent === 'orange' ? 'bg-orange' : 'bg-green'}`} />
      <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-[clamp(1.25rem,1.1rem+1.1vw,1.875rem)] font-bold tracking-[-0.04em] text-green-dark" aria-label={isLoading ? `Loading ${label}` : undefined}>
        {isLoading ? <span className="block h-8 w-16 animate-pulse rounded-md bg-sage/70 sm:h-9 sm:w-20" aria-hidden="true" /> : value}
      </p>
      <p className="mt-2 text-xs text-muted">{detail}</p>
    </article>
  )

  if (!to) return card

  return (
    <Link className="block transition-transform hover:-translate-y-0.5" to={to} aria-label={`View ${label}`}>
      {card}
    </Link>
  )
}