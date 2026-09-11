import { Prisma, type ShoppingMode } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { splitSearchTerms } from '../../utils/search.js'
import type {
  AdminCustomerAddress,
  AdminCustomerDetail,
  AdminCustomerListItem,
  AdminCustomersPage,
  AdminCustomersQuery,
  AdminCustomerSummary,
} from './customer.types.js'

const CUSTOMER_INACTIVE_AFTER_DAYS = 90

const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000)

// Aggregate per customer-account order activity once and reuse it for both the
// list and the summary so the two queries agree on counts and revenue. Orders
// are monetized through their paid totals (PAID), while the plain order count
// reflects every order the account has placed (any state).
const CUSTOMER_ORDERS_CTE = Prisma.sql`
WITH customer_orders AS (
  SELECT
    o.user_id AS user_id,
    COUNT(*)::int AS order_count,
    COUNT(*) FILTER (WHERE o.payment_status = 'PAID')::int AS paid_count,
    COALESCE(SUM(o.total) FILTER (WHERE o.payment_status = 'PAID'), 0) AS paid_total,
    MAX(o.created_at) AS last_order_at
  FROM orders o
  JOIN users u ON u.id = o.user_id
  WHERE u.role = 'CUSTOMER'
  GROUP BY o.user_id
)`

interface CustomerListRow {
  id: string
  name: string
  email: string
  phone: string | null
  shoppingMode: ShoppingMode
  createdAt: Date
  lastOrderAt: Date | null
  orderCount: number
  paidCount: number
  paidTotal: string
  total: number
}

const toCustomerListItem = (row: CustomerListRow, activeSince: Date): AdminCustomerListItem => {
  const lastOrderAt = row.lastOrderAt ? new Date(row.lastOrderAt).toISOString() : null
  const lastOrderAtMs = row.lastOrderAt?.getTime() ?? null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    shoppingMode: row.shoppingMode,
    createdAt: new Date(row.createdAt).toISOString(),
    lastOrderAt,
    totalOrders: row.orderCount,
    totalSpent: row.paidTotal,
    averageOrderValue: row.paidCount > 0 ? (Number(row.paidTotal) / row.paidCount).toFixed(2) : '0',
    isActive: lastOrderAtMs !== null
      ? lastOrderAtMs >= activeSince.getTime()
      : new Date(row.createdAt).getTime() >= activeSince.getTime(),
  }
}

export async function getCustomerSummary(): Promise<AdminCustomerSummary> {
  const rows = await prisma.$queryRaw<Array<{
    totalCustomers: number
    newThisMonth: number
    previousMonthCustomers: number
    repeatCustomerPct: number | null
    averageLifetimeSpend: string
  }>>`
    ${CUSTOMER_ORDERS_CTE}
    SELECT
      (SELECT COUNT(*)::int FROM users WHERE role = 'CUSTOMER') AS "totalCustomers",
      (SELECT COUNT(*)::int FROM users
         WHERE role = 'CUSTOMER' AND created_at >= date_trunc('month', now())) AS "newThisMonth",
      (SELECT COUNT(*)::int FROM users
         WHERE role = 'CUSTOMER'
           AND created_at >= date_trunc('month', now() - interval '1 month')
           AND created_at < date_trunc('month', now())) AS "previousMonthCustomers",
      (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE order_count >= 2) / NULLIF(COUNT(*) FILTER (WHERE order_count >= 1), 0), 1)::float8
         FROM customer_orders) AS "repeatCustomerPct",
      (SELECT COALESCE(ROUND(SUM(paid_total) FILTER (WHERE paid_count > 0) / NULLIF(COUNT(*) FILTER (WHERE paid_count > 0), 0), 2), 0)::text
         FROM customer_orders) AS "averageLifetimeSpend"
  `

  const row = rows[0]
  return {
    totalCustomers: row?.totalCustomers ?? 0,
    newThisMonth: row?.newThisMonth ?? 0,
    previousMonthCustomers: row?.previousMonthCustomers ?? 0,
    repeatCustomerPct: row?.repeatCustomerPct ?? null,
    averageLifetimeSpend: row?.averageLifetimeSpend ?? '0',
  }
}

export async function listAdminCustomers(query: AdminCustomersQuery): Promise<AdminCustomersPage> {
  const activeSince = daysAgo(CUSTOMER_INACTIVE_AFTER_DAYS)
  const conditions: Prisma.Sql[] = [Prisma.sql`u.role = 'CUSTOMER'`]

  if (query.search) {
    const terms = splitSearchTerms(query.search)
    if (terms.length > 0) {
      const termClauses = terms.map((term) =>
        Prisma.sql`(u.name ILIKE ${`%${term}%`} OR u.email ILIKE ${`%${term}%`} OR u.phone ILIKE ${`%${term}%`})`,
      )
      conditions.push(Prisma.sql`(${Prisma.join(termClauses, ' AND ')})`)
    }
  }

  if (query.status === 'active') {
    conditions.push(Prisma.sql`(co.last_order_at >= ${activeSince} OR u.created_at >= ${activeSince})`)
  } else if (query.status === 'inactive') {
    conditions.push(Prisma.sql`((co.last_order_at IS NULL OR co.last_order_at < ${activeSince}) AND u.created_at < ${activeSince})`)
  }

  if (query.minOrders !== undefined) {
    conditions.push(Prisma.sql`COALESCE(co.order_count, 0) >= ${query.minOrders}`)
  }
  if (query.maxOrders !== undefined) {
    conditions.push(Prisma.sql`COALESCE(co.order_count, 0) <= ${query.maxOrders}`)
  }
  if (query.lastOrder === 'older') {
    conditions.push(Prisma.sql`(co.last_order_at IS NULL OR co.last_order_at < ${daysAgo(180)})`)
  } else if (query.lastOrder !== undefined) {
    conditions.push(Prisma.sql`co.last_order_at >= ${daysAgo(query.lastOrder)}`)
  }

  const orderBy: Prisma.Sql = (() => {
    switch (query.sort) {
      case 'spend':
        return Prisma.sql`COALESCE(co.paid_total, 0) DESC, co.last_order_at DESC NULLS LAST`
      case 'orders':
        return Prisma.sql`COALESCE(co.order_count, 0) DESC, co.last_order_at DESC NULLS LAST`
      case 'newest':
        return Prisma.sql`u.created_at DESC`
      default:
        return Prisma.sql`co.last_order_at DESC NULLS LAST, u.created_at DESC`
    }
  })()

  const [rows, summary] = await Promise.all([
    prisma.$queryRaw<CustomerListRow[]>`
      ${CUSTOMER_ORDERS_CTE}
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.shopping_mode AS "shoppingMode",
        u.created_at AS "createdAt",
        co.last_order_at AS "lastOrderAt",
        COALESCE(co.order_count, 0) AS "orderCount",
        COALESCE(co.paid_count, 0) AS "paidCount",
        COALESCE(co.paid_total, 0)::text AS "paidTotal",
        COUNT(*) OVER ()::int AS "total"
      FROM users u
      LEFT JOIN customer_orders co ON co.user_id = u.id
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY ${orderBy}
      LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}
    `,
    getCustomerSummary(),
  ])

  const total = rows[0]?.total ?? 0

  return {
    customers: rows.map((row) => toCustomerListItem(row, activeSince)),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
    summary,
  }
}

interface CustomerOrderRow {
  orderNumber: string
  createdAt: Date
  total: Prisma.Decimal
  orderStatus: AdminCustomerDetail['orders'][number]['orderStatus']
  paymentStatus: AdminCustomerDetail['orders'][number]['paymentStatus']
  deliveryAddress: string
  city: string
  state: string | null
  _count: { orderItems: number }
}

export async function getCustomerDetail(id: string): Promise<AdminCustomerDetail> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      shoppingMode: true,
      createdAt: true,
      lastLoginAt: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        select: {
          orderNumber: true,
          createdAt: true,
          total: true,
          orderStatus: true,
          paymentStatus: true,
          deliveryAddress: true,
          city: true,
          state: true,
          _count: { select: { orderItems: true } },
        },
      },
    },
  })
  if (!user || user.role !== 'CUSTOMER') throw new HttpError(404, 'Customer not found.')

  const orders = user.orders as CustomerOrderRow[]
  const paidOrders = orders.filter((order) => order.paymentStatus === 'PAID')
  const totalSpent = paidOrders.reduce((sum, order) => sum + Number(order.total), 0)
  const averageOrderValue = paidOrders.length > 0 ? totalSpent / paidOrders.length : 0
  const lastOrderAt = orders[0]?.createdAt.getTime() ?? null
  const activeSince = daysAgo(CUSTOMER_INACTIVE_AFTER_DAYS)
  const isActive = lastOrderAt !== null
    ? lastOrderAt >= activeSince.getTime()
    : user.createdAt.getTime() >= activeSince.getTime()

  const seen = new Set<string>()
  const addresses: AdminCustomerAddress[] = []
  for (const order of orders) {
    if (addresses.length >= 5) break
    const key = `${order.deliveryAddress}|${order.city}|${order.state ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    addresses.push({ deliveryAddress: order.deliveryAddress, city: order.city, state: order.state })
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    shoppingMode: user.shoppingMode,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    lastOrderAt: lastOrderAt !== null ? new Date(lastOrderAt).toISOString() : null,
    totalOrders: orders.length,
    totalSpent: totalSpent.toFixed(2),
    averageOrderValue: averageOrderValue.toFixed(2),
    repeatCustomer: orders.length >= 2,
    isActive,
    orders: orders.map((order) => ({
      orderNumber: order.orderNumber,
      itemCount: order._count.orderItems,
      total: order.total.toString(),
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt.toISOString(),
    })),
    addresses,
  }
}