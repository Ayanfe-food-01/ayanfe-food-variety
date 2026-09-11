import { useState } from 'react'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { RevenueLineChart } from '../RevenueLineChart'
import type { AdminAnalytics } from '../../../services/adminService'

type ChartMetric = 'revenue' | 'orders'

const metrics: Array<{ key: ChartMetric; label: string }> = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'orders', label: 'Orders' },
]

interface AnalyticsTrendChartProps {
  analytics: AdminAnalytics | null
  isLoading: boolean
}

export function AnalyticsTrendChart({ analytics, isLoading }: AnalyticsTrendChartProps) {
  const [metric, setMetric] = useState<ChartMetric>('revenue')

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-labelledby="analytics-trend-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Trend</p>
          <h2 id="analytics-trend-heading" className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">Revenue &amp; orders</h2>
          <p className="mt-1 text-sm text-muted">
            {metric === 'revenue' ? 'Confirmed revenue across the selected period.' : 'Confirmed orders across the selected period.'}
          </p>
        </div>
        <div className="w-52 sm:w-60">
          <SegmentedControl ariaLabel="Trend chart metric" options={metrics} value={metric} onChange={(key) => setMetric(key as ChartMetric)} className="h-9 sm:h-10" />
        </div>
      </div>
      <div className="mt-6 text-muted">
        <RevenueLineChart points={analytics?.series ?? []} isLoading={isLoading} metric={metric} />
      </div>
    </section>
  )
}