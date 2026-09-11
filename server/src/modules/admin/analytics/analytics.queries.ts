import { Prisma } from '@prisma/client'
import { env } from '../../../config/env.js'
import type { AnalyticsRange } from './analytics.types.js'

export interface AnalyticsMetricsRow {
  range_from: string
  range_to: string
  revenue: string
  orders: number
  average_order_value: string
  prev_revenue: string
  prev_orders: number
  prev_average_order_value: string
}

export interface AnalyticsSeriesRow {
  label: string
  revenue: string
  orders: number
}

export interface AnalyticsTopProductRow {
  product_id: string
  product_name: string
  category_id: string | null
  category_name: string | null
  units_sold: number
  revenue: string
}

export interface AnalyticsCategoryRow {
  category_id: string | null
  category_name: string | null
  revenue: string
  units_sold: number
}

export interface AnalyticsCustomerRow {
  current_customers: number
  current_orders: number
  prev_customers: number
  current_returning: number
  prev_returning: number
}

const rangeBoundaries = (range: AnalyticsRange, from: string, to: string): Prisma.Sql => Prisma.sql`
bounds AS (
  SELECT
    date_trunc('day', now() AT TIME ZONE ${env.businessTimezone}) AS today_start,
    date_trunc('month', now() AT TIME ZONE ${env.businessTimezone}) AS month_start
),
config AS (
  SELECT
    base.period_start,
    base.period_end,
    base.period_start - (base.period_end - base.period_start) AS prev_start,
    base.period_start AS prev_end,
    base.range_key,
    CASE
      WHEN base.range_key = 'today' THEN 'hour'
      WHEN base.period_end - base.period_start <= interval '35 days' THEN 'day'
      ELSE 'month'
    END AS bucket,
    CASE
      WHEN base.range_key = 'today' THEN 'HH24:MI'
      WHEN base.period_end - base.period_start <= interval '35 days' THEN 'DD Mon'
      ELSE 'Mon'
    END AS label_format,
    CASE
      WHEN base.range_key = 'today' THEN interval '1 hour'
      WHEN base.period_end - base.period_start <= interval '35 days' THEN interval '1 day'
      ELSE interval '1 month'
    END AS bucket_interval
  FROM (
    SELECT
      CASE ${range}
        WHEN 'today' THEN today_start
        WHEN '7d' THEN today_start - interval '6 days'
        WHEN '30d' THEN today_start - interval '29 days'
        WHEN 'month' THEN month_start
        ELSE (${from}::date)::timestamp
      END AS period_start,
      CASE ${range}
        WHEN 'month' THEN month_start + interval '1 month'
        WHEN 'custom' THEN (${to}::date + 1)::timestamp
        ELSE today_start + interval '1 day'
      END AS period_end,
      ${range} AS range_key
    FROM bounds
  ) base
)`

export const analyticsMetricsSql = (range: AnalyticsRange, from: string, to: string): Prisma.Sql =>
  Prisma.sql`
WITH ${rangeBoundaries(range, from, to)},
eligible AS (
  SELECT
    o.total,
    (o.created_at AT TIME ZONE ${env.businessTimezone}) AS local_created_at
  FROM orders o
  WHERE o.payment_status = 'PAID' AND o.order_status <> 'CANCELLED'
)
SELECT
  to_char((SELECT period_start FROM config), 'YYYY-MM-DD') AS range_from,
  to_char((SELECT period_end FROM config) - interval '1 microsecond', 'YYYY-MM-DD') AS range_to,
  COALESCE(SUM(e.total) FILTER (WHERE e.local_created_at >= (SELECT period_start FROM config) AND e.local_created_at < (SELECT period_end FROM config)), 0)::numeric::text AS revenue,
  COUNT(*) FILTER (WHERE e.local_created_at >= (SELECT period_start FROM config) AND e.local_created_at < (SELECT period_end FROM config))::int AS orders,
  COALESCE(AVG(e.total) FILTER (WHERE e.local_created_at >= (SELECT period_start FROM config) AND e.local_created_at < (SELECT period_end FROM config)), 0)::numeric::text AS average_order_value,
  COALESCE(SUM(e.total) FILTER (WHERE e.local_created_at >= (SELECT prev_start FROM config) AND e.local_created_at < (SELECT prev_end FROM config)), 0)::numeric::text AS prev_revenue,
  COUNT(*) FILTER (WHERE e.local_created_at >= (SELECT prev_start FROM config) AND e.local_created_at < (SELECT prev_end FROM config))::int AS prev_orders,
  COALESCE(AVG(e.total) FILTER (WHERE e.local_created_at >= (SELECT prev_start FROM config) AND e.local_created_at < (SELECT prev_end FROM config)), 0)::numeric::text AS prev_average_order_value
FROM eligible e
`

export const analyticsSeriesSql = (range: AnalyticsRange, from: string, to: string): Prisma.Sql =>
  Prisma.sql`
WITH ${rangeBoundaries(range, from, to)},
series_buckets AS (
  SELECT
    generate_series(
      date_trunc(bucket, period_start),
      period_end - bucket_interval,
      bucket_interval
    ) AS bucket_start,
    bucket,
    label_format
  FROM config
),
aggregated AS (
  SELECT
    b.bucket_start,
    COALESCE(SUM(o.total), 0)::numeric::text AS revenue,
    COUNT(o.id)::int AS orders
  FROM series_buckets b
  LEFT JOIN orders o
    ON o.payment_status = 'PAID'
    AND o.order_status <> 'CANCELLED'
    AND date_trunc(b.bucket, (o.created_at AT TIME ZONE ${env.businessTimezone})) = b.bucket_start
  GROUP BY b.bucket_start
)
SELECT
  to_char(b.bucket_start, b.label_format) AS label,
  COALESCE(a.revenue, '0') AS revenue,
  COALESCE(a.orders, 0)::int AS orders
FROM series_buckets b
LEFT JOIN aggregated a ON a.bucket_start = b.bucket_start
ORDER BY b.bucket_start ASC
`

export const analyticsTopProductsSql = (range: AnalyticsRange, from: string, to: string): Prisma.Sql =>
  Prisma.sql`
WITH ${rangeBoundaries(range, from, to)}
SELECT
  oi.product_id AS product_id,
  oi.product_name AS product_name,
  p.category_id AS category_id,
  COALESCE(c.name, 'Uncategorized') AS category_name,
  SUM(oi.quantity)::int AS units_sold,
  SUM(oi.subtotal)::numeric::text AS revenue
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
LEFT JOIN products p ON p.id = oi.product_id
LEFT JOIN categories c ON c.id = p.category_id
WHERE o.payment_status = 'PAID'
  AND o.order_status <> 'CANCELLED'
  AND (o.created_at AT TIME ZONE ${env.businessTimezone}) >= (SELECT period_start FROM config)
  AND (o.created_at AT TIME ZONE ${env.businessTimezone}) < (SELECT period_end FROM config)
GROUP BY oi.product_id, oi.product_name, p.category_id, c.name
ORDER BY revenue DESC, units_sold DESC, oi.product_name ASC
LIMIT 20
`

export const analyticsCategoriesSql = (range: AnalyticsRange, from: string, to: string): Prisma.Sql =>
  Prisma.sql`
WITH ${rangeBoundaries(range, from, to)}
SELECT
  c.id AS category_id,
  c.name AS category_name,
  SUM(oi.subtotal)::numeric::text AS revenue,
  SUM(oi.quantity)::int AS units_sold
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
LEFT JOIN products p ON p.id = oi.product_id
LEFT JOIN categories c ON c.id = p.category_id
WHERE o.payment_status = 'PAID'
  AND o.order_status <> 'CANCELLED'
  AND (o.created_at AT TIME ZONE ${env.businessTimezone}) >= (SELECT period_start FROM config)
  AND (o.created_at AT TIME ZONE ${env.businessTimezone}) < (SELECT period_end FROM config)
GROUP BY c.id, c.name
ORDER BY revenue DESC
LIMIT 10
`

export const analyticsCustomersSql = (range: AnalyticsRange, from: string, to: string): Prisma.Sql =>
  Prisma.sql`
WITH ${rangeBoundaries(range, from, to)},
eligible AS (
  SELECT
    COALESCE(o.user_id::text, o.phone) AS customer_key,
    (o.created_at AT TIME ZONE ${env.businessTimezone}) AS local_created_at
  FROM orders o
  WHERE o.payment_status = 'PAID' AND o.order_status <> 'CANCELLED'
),
first_orders AS (
  SELECT
    COALESCE(user_id::text, phone) AS customer_key,
    MIN(created_at AT TIME ZONE ${env.businessTimezone}) AS first_local
  FROM orders
  WHERE payment_status = 'PAID' AND order_status <> 'CANCELLED'
  GROUP BY COALESCE(user_id::text, phone)
)
SELECT
  COUNT(DISTINCT e.customer_key) FILTER (
    WHERE e.local_created_at >= (SELECT period_start FROM config) AND e.local_created_at < (SELECT period_end FROM config)
  )::int AS current_customers,
  COUNT(*) FILTER (
    WHERE e.local_created_at >= (SELECT period_start FROM config) AND e.local_created_at < (SELECT period_end FROM config)
  )::int AS current_orders,
  COUNT(DISTINCT e.customer_key) FILTER (
    WHERE e.local_created_at >= (SELECT prev_start FROM config) AND e.local_created_at < (SELECT prev_end FROM config)
  )::int AS prev_customers,
  COUNT(DISTINCT e.customer_key) FILTER (
    WHERE e.local_created_at >= (SELECT period_start FROM config) AND e.local_created_at < (SELECT period_end FROM config)
      AND fo.first_local < (SELECT period_start FROM config)
  )::int AS current_returning,
  COUNT(DISTINCT e.customer_key) FILTER (
    WHERE e.local_created_at >= (SELECT prev_start FROM config) AND e.local_created_at < (SELECT prev_end FROM config)
      AND fo.first_local < (SELECT prev_start FROM config)
  )::int AS prev_returning
FROM eligible e
JOIN first_orders fo ON fo.customer_key = e.customer_key
`
