import { Link } from 'react-router-dom'

export interface MetricTrend {
  direction: 'up' | 'down'
  label: string
}

interface DashboardMetricCardProps {
  label: string
  value: string | number
  detail?: string
  trend?: MetricTrend | null
  accent?: 'green' | 'orange'
  isLoading?: boolean
  to?: string
}

export function DashboardMetricCard({
  label,
  value,
  detail,
  trend,
  accent = 'green',
  isLoading = false,
  to,
}: DashboardMetricCardProps) {
  const card = (
    <article className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className={`mb-6 size-2.5 rounded-full ${accent === 'orange' ? 'bg-orange' : 'bg-green'}`} />
      <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-[22px] leading-7 font-bold tracking-[-0.03em] text-green-dark">
        {isLoading ? <span className="inline-block h-6 w-20 animate-pulse rounded-md bg-sage/70 align-middle" aria-label={`Loading ${label}`} /> : value}
      </p>
      {trend && (
        <p className={`mt-2 flex items-center gap-1 text-xs font-bold ${trend.direction === 'up' ? 'text-green' : 'text-orange'}`}>
          <span aria-hidden="true">{trend.direction === 'up' ? '↑' : '↓'}</span>
          {trend.label}
        </p>
      )}
      {detail && !trend && <p className="mt-2 text-xs text-muted">{detail}</p>}
    </article>
  )

  if (!to) return card

  return (
    <Link className="block transition-transform hover:-translate-y-0.5" to={to} aria-label={`View ${label}`}>
      {card}
    </Link>
  )
}