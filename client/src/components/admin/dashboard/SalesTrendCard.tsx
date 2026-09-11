import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from '../../../assets/icons'
import { getAdminAnalytics, type AdminAnalytics } from '../../../services/adminService'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { RevenueLineChart } from '../RevenueLineChart'

const trendRanges = [
  { key: 'week', label: '7 days' },
  { key: 'month', label: '30 days' },
]

type TrendRange = 'week' | 'month'

export function SalesTrendCard() {
  const [range, setRange] = useState<TrendRange>('week')
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    queueMicrotask(() => {
      if (current) {
        setIsLoading(true)
        setError(null)
      }
    })
    getAdminAnalytics(range)
      .then((result) => {
        if (current) setAnalytics(result)
      })
      .catch((caught: unknown) => {
        if (current) setError(caught instanceof Error ? caught.message : 'Sales trend could not be loaded.')
      })
      .finally(() => {
        if (current) setIsLoading(false)
      })
    return () => {
      current = false
    }
  }, [range])

  return (
    <section className="h-full rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Sales trend</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">Revenue over time</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-[220px] shrink-0">
            <SegmentedControl
              ariaLabel="Sales trend range"
              options={trendRanges}
              value={range}
              onChange={(key) => setRange(key as TrendRange)}
            />
          </div>
          <Link className="flex shrink-0 items-center gap-1 text-sm font-bold text-green hover:text-orange" to="/admin/analytics">
            Details <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      {error ? (
        <div className="mt-5 rounded-xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>
      ) : (
        <div className="mt-5">
          <RevenueLineChart points={analytics?.series ?? []} isLoading={isLoading} />
        </div>
      )}
    </section>
  )
}