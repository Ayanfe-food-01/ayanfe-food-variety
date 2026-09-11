import { prisma } from '../../../config/prisma.js'
import { env } from '../../../config/env.js'
import {
  analyticsMetricsSql,
  analyticsSeriesSql,
  analyticsTopProductsSql,
  analyticsCategoriesSql,
  analyticsCustomersSql,
  type AnalyticsMetricsRow,
  type AnalyticsSeriesRow,
  type AnalyticsTopProductRow,
  type AnalyticsCategoryRow,
  type AnalyticsCustomerRow,
} from './analytics.queries.js'
import type {
  AdminAnalytics,
  AnalyticsCategoryShare,
  AnalyticsOptions,
} from './analytics.types.js'

const percentChange = (current: number, previous: number): number | null => {
  if (previous === 0) return current > 0 ? 100 : null
  return Math.round(((current - previous) / previous) * 100)
}

const pointChange = (current: number | null, previous: number | null): number | null => {
  if (current === null || previous === null) return null
  return Math.round((current - previous) * 10) / 10
}

const repeatCustomerRate = (returning: number, total: number): number | null => {
  if (total <= 0) return null
  return Math.round((returning / total) * 1000) / 10
}

const averagePerCustomer = (orders: number, customers: number): number => {
  if (customers <= 0) return 0
  return Math.round((orders / customers) * 10) / 10
}

const computeCategoryShares = (rows: AnalyticsCategoryRow[]): AnalyticsCategoryShare[] => {
  const totalRevenue = rows.reduce((sum, row) => sum + Number(row.revenue), 0)
  return rows.map((row) => {
    const revenue = Number(row.revenue)
    return {
      categoryId: row.category_id,
      categoryName: row.category_name ?? 'Uncategorized',
      revenue: row.revenue,
      unitsSold: row.units_sold,
      share: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 1000) / 10 : 0,
    }
  })
}

export async function getAdminAnalytics(options: AnalyticsOptions): Promise<AdminAnalytics> {
  const { range, from = '', to = '' } = options

  const [metricsRows, seriesRows, topProductRows, categoryRows, customerRows] =
    await Promise.all([
      prisma.$queryRaw<AnalyticsMetricsRow[]>(analyticsMetricsSql(range, from, to)),
      prisma.$queryRaw<AnalyticsSeriesRow[]>(analyticsSeriesSql(range, from, to)),
      prisma.$queryRaw<AnalyticsTopProductRow[]>(analyticsTopProductsSql(range, from, to)),
      prisma.$queryRaw<AnalyticsCategoryRow[]>(analyticsCategoriesSql(range, from, to)),
      prisma.$queryRaw<AnalyticsCustomerRow[]>(analyticsCustomersSql(range, from, to)),
    ])

  const metrics = metricsRows[0]
  if (!metrics) {
    throw new Error('Analytics summary could not be generated.')
  }

  const customers = customerRows[0] ?? {
    current_customers: 0,
    current_orders: 0,
    prev_customers: 0,
    current_returning: 0,
    prev_returning: 0,
  }

  const repeatRate = repeatCustomerRate(
    customers.current_returning,
    customers.current_customers,
  )
  const prevRepeatRate = repeatCustomerRate(
    customers.prev_returning,
    customers.prev_customers,
  )

  return {
    timezone: env.businessTimezone,
    range: { key: range, from: metrics.range_from, to: metrics.range_to },
    summary: {
      revenue: metrics.revenue,
      orders: metrics.orders,
      averageOrderValue: metrics.average_order_value,
      repeatCustomerRate: repeatRate,
    },
    trends: {
      revenue: percentChange(Number(metrics.revenue), Number(metrics.prev_revenue)),
      orders: percentChange(metrics.orders, metrics.prev_orders),
      averageOrderValue: percentChange(
        Number(metrics.average_order_value),
        Number(metrics.prev_average_order_value),
      ),
      repeatCustomerRate: pointChange(repeatRate, prevRepeatRate),
    },
    series: seriesRows.map((row) => ({
      label: row.label,
      revenue: row.revenue,
      orders: row.orders,
    })),
    topProducts: topProductRows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      categoryId: row.category_id,
      categoryName: row.category_name ?? 'Uncategorized',
      unitsSold: row.units_sold,
      revenue: row.revenue,
    })),
    categories: computeCategoryShares(categoryRows),
    customers: {
      newCustomers: Math.max(0, customers.current_customers - customers.current_returning),
      returningCustomers: customers.current_returning,
      totalCustomers: customers.current_customers,
      averageOrdersPerCustomer: averagePerCustomer(
        customers.current_orders,
        customers.current_customers,
      ),
      repeatCustomerRate: repeatRate,
    },
  }
}
