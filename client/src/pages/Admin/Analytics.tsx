import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import { getAdminAnalytics, type AdminAnalytics, type AnalyticsRange } from '../../services/adminService'
import { StatCard } from '../../components/admin/StatCard'
import { RevenueLineChart } from '../../components/admin/RevenueLineChart'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'

const ranges: Array<{ value: AnalyticsRange; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
]

const formatPrice = (value: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value))

export function Analytics() {
  const [range, setRange] = useState<AnalyticsRange>('month')
  const [analyticsByRange, setAnalyticsByRange] = useState<Partial<Record<AnalyticsRange, AdminAnalytics>>>({})
  const [errorsByRange, setErrorsByRange] = useState<Partial<Record<AnalyticsRange, string>>>({})

  useEffect(() => {
    let current = true
    getAdminAnalytics(range)
      .then((result) => {
        if (current) setAnalyticsByRange((prev) => ({ ...prev, [range]: result }))
      })
      .catch((caught: unknown) => {
        if (current) {
          setErrorsByRange((prev) => ({
            ...prev,
            [range]: caught instanceof ApiError ? caught.message : 'Analytics could not be loaded.',
          }))
        }
      })
    return () => { current = false }
  }, [range])

  const analytics = analyticsByRange[range] ?? null
  const error = errorsByRange[range] ?? null

  useInitialRouteLoad(Boolean(analytics || error))

  const summary = analytics?.summary
  const metrics = analytics?.metrics

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Revenue intelligence</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Sales analytics</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Track confirmed revenue and order activity across your store. Revenue includes paid, non-cancelled orders only.
          </p>
        </div>
        <p className="text-xs text-muted">{analytics ? `Business timezone: ${analytics.timezone}` : 'Loading business timezone…'}</p>
      </div>

      {error && (
        <div className="mt-8 rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">
          {error}
        </div>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Revenue summary">
        <StatCard label="Today's revenue" value={summary ? formatPrice(summary.todayRevenue) : ''} detail="Paid orders today" isLoading={!analytics && !error} />
        <StatCard label="This week's revenue" value={summary ? formatPrice(summary.weekRevenue) : ''} detail="Paid orders this week" isLoading={!analytics && !error} />
        <StatCard label="This month's revenue" value={summary ? formatPrice(summary.monthRevenue) : ''} detail="Paid orders this month" isLoading={!analytics && !error} />
        <StatCard label="This year's revenue" value={summary ? formatPrice(summary.yearRevenue) : ''} detail="Paid orders this year" isLoading={!analytics && !error} />
        <StatCard label="Total orders" value={summary?.totalOrders ?? ''} detail="All orders recorded" accent="orange" isLoading={!analytics && !error} />
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-labelledby="revenue-chart-heading">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Trend</p>
            <h2 id="revenue-chart-heading" className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">Revenue over time</h2>
            <p className="mt-1 text-sm text-muted">Confirmed revenue aggregated by {range === 'today' ? 'hour' : range === 'year' ? 'month' : 'day'}.</p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Revenue chart range">
            {ranges.map((option) => (
              <button
                className={`rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${range === option.value ? 'bg-green text-cream' : 'border border-line bg-cream text-muted hover:border-green hover:text-green-dark'}`}
                type="button"
                aria-pressed={range === option.value}
                onClick={() => setRange(option.value)}
                key={option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 text-muted">
          <RevenueLineChart points={analytics?.series ?? []} isLoading={!analytics && !error} />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="sales-metrics-heading">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Operations</p>
          <h2 id="sales-metrics-heading" className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">Sales information</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Confirmed orders" value={metrics?.confirmedOrders ?? ''} detail="Paid, non-cancelled orders" isLoading={!analytics && !error} />
          <StatCard label="Pending orders" value={metrics?.pendingOrders ?? ''} detail="Payment still pending" accent="orange" isLoading={!analytics && !error} />
          <StatCard label="Cancelled orders" value={metrics?.cancelledOrders ?? ''} detail="Orders marked cancelled" accent="orange" isLoading={!analytics && !error} />
          <StatCard label="Average order value" value={metrics ? formatPrice(metrics.averageOrderValue) : ''} detail="Across confirmed revenue" isLoading={!analytics && !error} />
        </div>
      </section>
    </div>
  )
}