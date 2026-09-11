import { useState } from 'react'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
import {
  AnalyticsRangeSelector,
  AnalyticsMetricCard,
  AnalyticsTrendChart,
  AnalyticsTopProductsCard,
  CategoryBreakdownCard,
  CustomerInsightsCard,
  ExportButton,
  useAdminAnalytics,
  formatPrice,
  formatNumber,
  formatRate,
  formatTrendValue,
  trendLabelFor,
  toDateInput,
  daysAgoInput,
  formatDateRange,
} from '../../components/admin/analytics'
import type { AnalyticsRange } from '../../services/adminService'

export function Analytics() {
  const [range, setRange] = useState<AnalyticsRange>('7d')
  const [from, setFrom] = useState(() => daysAgoInput(29))
  const [to, setTo] = useState(() => toDateInput(new Date()))

  const customReady = range !== 'custom' || (from !== '' && to !== '' && from <= to)
  const { analytics, error } = useAdminAnalytics({
    range,
    from,
    to,
    enabled: customReady,
  })

  useInitialRouteLoad(Boolean(analytics || error))

  const summary = analytics?.summary
  const trends = analytics?.trends

  const trendOf = (value: number | null, suffix = '%') =>
    value === null
      ? null
      : {
          direction: value < 0 ? ('down' as const) : ('up' as const),
          label: `${value > 0 ? '+' : ''}${formatTrendValue(value)}${suffix} ${trendLabelFor(range)}`,
        }

  const sectionLoading = !analytics && !error

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <Breadcrumb className="mb-5" items={[{ label: 'Dashboard', href: '/admin' }, { label: 'Sales analytics' }]} />
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Revenue intelligence</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Sales analytics</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Every number on this page reflects the selected date range. Revenue includes paid, non-cancelled orders only.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
          <ExportButton analytics={analytics} />
          <AnalyticsRangeSelector
            range={range}
            from={from}
            to={to}
            onRangeChange={setRange}
            onFromChange={setFrom}
            onToChange={setTo}
          />
        </div>
      </div>

      {analytics && (
        <p className="mt-5 text-xs text-muted">
          Showing {formatDateRange(analytics.range.from, analytics.range.to)} · Business timezone: {analytics.timezone}
        </p>
      )}

      {error && (
        <div className="mt-8 rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">
          {error}
        </div>
      )}

      {!customReady && !error && (
        <div className="mt-8 rounded-2xl border border-line bg-cream p-5 text-sm text-muted" role="status">
          Select both the start and end dates to view analytics for a custom range. Dates use the store's business timezone.
        </div>
      )}

      <section className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4" aria-label="Summary metrics">
        <AnalyticsMetricCard
          label="Total revenue"
          value={summary ? formatPrice(summary.revenue) : ''}
          trend={trendOf(trends?.revenue ?? null)}
          isLoading={sectionLoading}
        />
        <AnalyticsMetricCard
          label="Total orders"
          value={summary ? formatNumber(summary.orders) : ''}
          trend={trendOf(trends?.orders ?? null)}
          isLoading={sectionLoading}
        />
        <AnalyticsMetricCard
          label="Average order value"
          value={summary ? formatPrice(summary.averageOrderValue) : ''}
          trend={trendOf(trends?.averageOrderValue ?? null)}
          isLoading={sectionLoading}
        />
        <AnalyticsMetricCard
          label="Repeat customer rate"
          value={summary ? formatRate(summary.repeatCustomerRate) : ''}
          accent="orange"
          trend={trendOf(trends?.repeatCustomerRate ?? null, ' pts')}
          isLoading={sectionLoading}
        />
      </section>

      <div className="mt-8">
        <AnalyticsTrendChart analytics={analytics} isLoading={sectionLoading} />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <AnalyticsTopProductsCard analytics={analytics} isLoading={sectionLoading} />
        </div>
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-2">
          <CategoryBreakdownCard analytics={analytics} isLoading={sectionLoading} />
          <CustomerInsightsCard analytics={analytics} isLoading={sectionLoading} />
        </div>
      </div>
    </div>
  )
}