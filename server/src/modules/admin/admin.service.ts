import { OrderStatus, PaymentStatus, PaymentSubmissionStatus, Prisma } from '@prisma/client'
import { env } from '../../config/env.js'
import { prisma } from '../../config/prisma.js'
import type { AdminAnalytics, AnalyticsRange, DashboardStats, RevenuePoint } from './admin.types.js'

type AnalyticsSummaryRow = {
  today_revenue: Prisma.Decimal
  week_revenue: Prisma.Decimal
  month_revenue: Prisma.Decimal
  year_revenue: Prisma.Decimal
  total_orders: number
  confirmed_orders: number
  pending_orders: number
  cancelled_orders: number
  average_order_value: Prisma.Decimal
}

type AnalyticsSeriesRow = {
  label: string
  revenue: Prisma.Decimal
  orders: number
}

const decimalString = (value: Prisma.Decimal | null | undefined): string => value?.toString() ?? '0'

export async function getDashboardStats(): Promise<DashboardStats> {
  const [totalOrders, orderPlacedOrders, processingOrders, deliveredOrders, cancelledOrders, pendingPaymentVerification, verifiedPayments, sales] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { orderStatus: OrderStatus.ORDER_PLACED } }),
      prisma.order.count({ where: { orderStatus: OrderStatus.PROCESSING } }),
      prisma.order.count({ where: { orderStatus: OrderStatus.DELIVERED } }),
      prisma.order.count({ where: { orderStatus: OrderStatus.CANCELLED } }),
      prisma.paymentSubmission.count({ where: { status: PaymentSubmissionStatus.PENDING } }),
      prisma.paymentSubmission.count({ where: { status: PaymentSubmissionStatus.VERIFIED } }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentStatus: PaymentStatus.PAID, orderStatus: { not: OrderStatus.CANCELLED } },
      }),
    ])

  return {
    totalOrders,
    orderPlacedOrders,
    processingOrders,
    deliveredOrders,
    cancelledOrders,
    pendingPaymentVerification,
    verifiedPayments,
    totalSales: sales._sum.total?.toString() ?? '0',
  }
}

export async function getAdminAnalytics(range: AnalyticsRange): Promise<AdminAnalytics> {
  const [summaryRows, seriesRows] = await Promise.all([
    prisma.$queryRaw<AnalyticsSummaryRow[]>`
      WITH bounds AS (
        SELECT
          date_trunc('day', now() AT TIME ZONE ${env.businessTimezone}) AS today_start,
          date_trunc('week', now() AT TIME ZONE ${env.businessTimezone}) AS week_start,
          date_trunc('month', now() AT TIME ZONE ${env.businessTimezone}) AS month_start,
          date_trunc('year', now() AT TIME ZONE ${env.businessTimezone}) AS year_start
      ),
      eligible_orders AS (
        SELECT
          total,
          created_at AT TIME ZONE ${env.businessTimezone} AS local_created_at
        FROM orders
        WHERE payment_status = 'PAID'
          AND order_status <> 'CANCELLED'
      )
      SELECT
        COALESCE(SUM(CASE WHEN local_created_at >= today_start AND local_created_at < today_start + interval '1 day' THEN total ELSE 0 END), 0)::numeric AS today_revenue,
        COALESCE(SUM(CASE WHEN local_created_at >= week_start AND local_created_at < week_start + interval '7 days' THEN total ELSE 0 END), 0)::numeric AS week_revenue,
        COALESCE(SUM(CASE WHEN local_created_at >= month_start AND local_created_at < month_start + interval '1 month' THEN total ELSE 0 END), 0)::numeric AS month_revenue,
        COALESCE(SUM(CASE WHEN local_created_at >= year_start AND local_created_at < year_start + interval '1 year' THEN total ELSE 0 END), 0)::numeric AS year_revenue,
        (SELECT COUNT(*)::int FROM orders) AS total_orders,
        (SELECT COUNT(*)::int FROM orders WHERE payment_status = 'PAID' AND order_status <> 'CANCELLED') AS confirmed_orders,
        (SELECT COUNT(*)::int FROM orders WHERE payment_status = 'PENDING' AND order_status <> 'CANCELLED') AS pending_orders,
        (SELECT COUNT(*)::int FROM orders WHERE order_status = 'CANCELLED') AS cancelled_orders,
        COALESCE(AVG(total), 0)::numeric AS average_order_value
      FROM eligible_orders
      CROSS JOIN bounds
    `,
    prisma.$queryRaw<AnalyticsSeriesRow[]>`
      WITH bounds AS (
        SELECT
          date_trunc('day', now() AT TIME ZONE ${env.businessTimezone}) AS today_start,
          date_trunc('week', now() AT TIME ZONE ${env.businessTimezone}) AS week_start,
          date_trunc('month', now() AT TIME ZONE ${env.businessTimezone}) AS month_start,
          date_trunc('year', now() AT TIME ZONE ${env.businessTimezone}) AS year_start
      ),
      config AS (
        SELECT
          CASE ${range}
            WHEN 'today' THEN today_start
            WHEN 'week' THEN week_start
            WHEN 'month' THEN month_start
            ELSE year_start
          END AS period_start,
          CASE ${range}
            WHEN 'today' THEN today_start + interval '1 day'
            WHEN 'week' THEN week_start + interval '7 days'
            WHEN 'month' THEN month_start + interval '1 month'
            ELSE year_start + interval '1 year'
          END AS period_end,
          CASE ${range}
            WHEN 'today' THEN 'hour'
            WHEN 'year' THEN 'month'
            ELSE 'day'
          END AS bucket,
          CASE ${range}
            WHEN 'today' THEN 'HH24:MI'
            WHEN 'year' THEN 'Mon'
            ELSE 'DD Mon'
          END AS label_format
        FROM bounds
      ),
      buckets AS (
        SELECT
          generate_series(
            period_start,
            period_end - CASE bucket
              WHEN 'hour' THEN interval '1 hour'
              WHEN 'month' THEN interval '1 month'
              ELSE interval '1 day'
            END,
            CASE bucket
              WHEN 'hour' THEN interval '1 hour'
              WHEN 'month' THEN interval '1 month'
              ELSE interval '1 day'
            END
          ) AS bucket_start,
          bucket,
          label_format
        FROM config
      ),
      aggregated AS (
        SELECT
          b.bucket_start,
          COALESCE(SUM(o.total), 0)::numeric AS revenue,
          COUNT(o.id)::int AS orders
        FROM buckets b
        LEFT JOIN orders o
          ON o.payment_status = 'PAID'
          AND o.order_status <> 'CANCELLED'
          AND date_trunc(b.bucket, o.created_at AT TIME ZONE ${env.businessTimezone}) = b.bucket_start
        GROUP BY b.bucket, b.bucket_start
      )
      SELECT
        to_char(b.bucket_start, b.label_format) AS label,
        COALESCE(a.revenue, 0)::numeric AS revenue,
        COALESCE(a.orders, 0)::int AS orders
      FROM buckets b
      LEFT JOIN aggregated a ON a.bucket_start = b.bucket_start
      ORDER BY b.bucket_start ASC
    `,
  ])

  const summary = summaryRows[0]
  if (!summary) {
    throw new Error('Analytics summary could not be generated.')
  }

  const series: RevenuePoint[] = seriesRows.map((point) => ({
    label: point.label,
    revenue: decimalString(point.revenue),
    orders: point.orders,
  }))

  return {
    timezone: env.businessTimezone,
    range,
    summary: {
      todayRevenue: decimalString(summary.today_revenue),
      weekRevenue: decimalString(summary.week_revenue),
      monthRevenue: decimalString(summary.month_revenue),
      yearRevenue: decimalString(summary.year_revenue),
      totalOrders: summary.total_orders,
    },
    metrics: {
      confirmedOrders: summary.confirmed_orders,
      pendingOrders: summary.pending_orders,
      cancelledOrders: summary.cancelled_orders,
      averageOrderValue: decimalString(summary.average_order_value),
    },
    series,
  }
}
