import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatCard } from '../../components/admin/StatCard'
import { getDashboardStats, type DashboardStats } from '../../services/adminService'

const formatPrice = (value: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value))

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDashboardStats().then(setStats).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Dashboard data could not be loaded.'))
  }, [])

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Overview</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Dashboard</h1>
          <p className="mt-3 text-sm leading-6 text-muted">A live view of orders, payments, and store performance.</p>
        </div>
      </div>

      {error ? (
        <div className="mt-8 rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">{error}</div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total orders" value={stats?.totalOrders ?? '—'} detail="All orders recorded" />
          <StatCard label="Pending orders" value={stats?.pendingOrders ?? '—'} detail="Awaiting fulfillment" accent="orange" />
          <StatCard label="Processing orders" value={stats?.processingOrders ?? '—'} detail="Being prepared" />
          <StatCard label="Completed orders" value={stats?.completedOrders ?? '—'} detail="Fulfillment complete" />
          <StatCard label="Cancelled orders" value={stats?.cancelledOrders ?? '—'} detail="Cancelled orders" accent="orange" />
          <StatCard label="Payment review" value={stats?.pendingPaymentVerification ?? '—'} detail="Receipts awaiting review" accent="orange" />
          <StatCard label="Verified payments" value={stats?.verifiedPayments ?? '—'} detail="Approved payment proofs" />
          <StatCard label="Total sales" value={stats ? formatPrice(stats.totalSales) : '—'} detail="Verified payment orders" />
        </div>
      )}

      <section className="mt-8">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Quick actions</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-green-dark">Keep operations moving</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link className="rounded-xl border border-line p-4 transition-colors hover:border-green/30 hover:bg-sage/20" to="/admin/orders"><p className="font-bold text-green-dark">Manage orders</p><p className="mt-1 text-xs leading-5 text-muted">Open orders and update fulfillment status.</p></Link>
            <Link className="rounded-xl border border-line p-4 transition-colors hover:border-green/30 hover:bg-sage/20" to="/admin/settings"><p className="font-bold text-green-dark">Payment settings</p><p className="mt-1 text-xs leading-5 text-muted">Keep customer transfer instructions current.</p></Link>
          </div>
        </div>
      </section>
    </div>
  )
}