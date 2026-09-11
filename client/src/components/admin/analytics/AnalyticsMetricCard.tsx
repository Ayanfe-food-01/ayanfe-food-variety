export interface AnalyticsMetricTrend {
  direction: 'up' | 'down'
  label: string
}

interface AnalyticsMetricCardProps {
  label: string
  value: string
  detail?: string
  trend?: AnalyticsMetricTrend | null
  accent?: 'green' | 'orange'
  isLoading?: boolean
}

export function AnalyticsMetricCard({
  label,
  value,
  detail,
  trend,
  accent = 'green',
  isLoading = false,
}: AnalyticsMetricCardProps) {
  return (
    <article className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
      <div className={`mb-5 size-2.5 rounded-full sm:mb-6 ${accent === 'orange' ? 'bg-orange' : 'bg-green'}`} />
      <p className="m-0 truncate text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-[clamp(1.25rem,1.1rem+1.1vw,1.875rem)] font-bold tracking-[-0.04em] text-green-dark">
        {isLoading ? (
          <span className="block h-8 w-16 animate-pulse rounded-md bg-sage/70 sm:h-9 sm:w-20" aria-label={`Loading ${label}`} />
        ) : (
          value
        )}
      </p>
      {trend ? (
        <p className={`mt-2 flex items-center gap-1 text-xs font-bold ${trend.direction === 'up' ? 'text-green' : 'text-orange'}`}>
          <span aria-hidden="true">{trend.direction === 'up' ? '↑' : '↓'}</span>
          <span className="truncate">{trend.label}</span>
        </p>
      ) : detail ? (
        <p className="mt-2 text-xs text-muted">{detail}</p>
      ) : null}
    </article>
  )
}