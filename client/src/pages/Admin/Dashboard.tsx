import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
import {
  DashboardMetricCard,
  NeedsAttentionCard,
  PaymentMethodsCard,
  QuickActions,
  RecentOrdersCard,
  SalesTrendCard,
  TopProductsCard,
  formatPercentChange,
  useDashboardData,
} from '../../components/admin/dashboard'
import { formatPrice } from '../../components/admin/orderPresentation'

export function Dashboard() {
  const { stats, inventory, pendingQuotes, isLoading, error } = useDashboardData()
  useInitialRouteLoad(!isLoading)

  const ordersAwaiting = stats?.orderPlacedOrders ?? 0
  const lowStock = inventory?.lowStockCount ?? 0
  const needsAttentionTotal = lowStock + pendingQuotes + ordersAwaiting

  const revenueChange = stats
    ? formatPercentChange(Number(stats.todayRevenue), Number(stats.yesterdayRevenue))
    : null
  const orderChange = stats
    ? formatPercentChange(Number(stats.todayOrders), Number(stats.yesterdayOrders))
    : null

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
        <>
          <section className="mt-8" aria-label="Quick actions">
            <QuickActions />
          </section>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-4">
            <DashboardMetricCard
              label="Revenue today"
              value={stats ? formatPrice(stats.todayRevenue) : ''}
              isLoading={isLoading}
              trend={revenueChange === null ? null : revenueChange === 0 ? null : {
                direction: revenueChange > 0 ? 'up' : 'down',
                label: `${Math.abs(revenueChange)}% vs yesterday`,
              }}
              to="/admin/analytics"
            />
            <DashboardMetricCard
              label="Orders today"
              value={stats?.todayOrders ?? 0}
              isLoading={isLoading}
              detail={stats ? `${ordersAwaiting} awaiting fulfillment` : undefined}
              trend={orderChange === null || orderChange === 0 ? null : {
                direction: orderChange > 0 ? 'up' : 'down',
                label: `${Math.abs(orderChange)}% vs yesterday`,
              }}
              to="/admin/orders"
            />
            <DashboardMetricCard
              label="Average order value"
              value={stats ? formatPrice(stats.averageOrderValue) : ''}
              isLoading={isLoading}
              detail="Across all paid orders"
              to="/admin/analytics"
            />
            <NeedsAttentionCard
              total={isLoading ? 0 : needsAttentionTotal}
              isLoading={isLoading}
              items={[
                { label: 'Low stock items', count: lowStock, to: '/admin/inventory?status=low-stock' },
                { label: 'Pending quote requests', count: pendingQuotes, to: '/admin/quote-requests' },
                { label: 'Orders awaiting confirmation', count: ordersAwaiting, to: '/admin/orders' },
              ]}
            />
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SalesTrendCard />
            </div>
            <PaymentMethodsCard
              paystack={stats?.paymentMethodBreakdown.paystack ?? { count: 0, revenue: '0' }}
              bankTransfer={stats?.paymentMethodBreakdown.bankTransfer ?? { count: 0, revenue: '0' }}
              isLoading={isLoading}
            />
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentOrdersCard
                orders={stats?.recentOrders ?? []}
                isLoading={isLoading}
                newCustomersThisWeek={stats?.newCustomersThisWeek}
              />
            </div>
            <TopProductsCard products={stats?.topProducts ?? []} isLoading={isLoading} />
          </div>
        </>
      )}
    </div>
  )
}