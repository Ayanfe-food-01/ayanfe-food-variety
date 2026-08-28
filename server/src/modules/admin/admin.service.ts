import { FulfillmentMethod, OrderStatus, PaymentSubmissionStatus, PaymentStatus, Prisma } from '@prisma/client'
import { env } from '../../config/env.js'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type {
  AdminAnalytics,
  AdminOrderListItem,
  AdminOrdersPage,
  AdminOrdersQuery,
  AdminPaymentsPage,
  AdminPaymentsQuery,
  AdminPaymentListItem,
  AnalyticsRange,
  DashboardStats,
  RevenuePoint,
  UpdateOrderStatusInput,
} from './admin.types.js'
import { notifyOrderStatusChanged } from '../orders/order.email.js'
import { restoreStock } from '../inventory/inventory.service.js'

const toOrderListItem = (order: {
  orderNumber: string
  customerName: string
  email: string | null
  phone: string
  fulfillmentMethod: FulfillmentMethod
  total: Prisma.Decimal
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  archivedAt: Date | null
  createdAt: Date
}): AdminOrderListItem => ({
  orderNumber: order.orderNumber,
  customerName: order.customerName,
  email: order.email,
  phone: order.phone,
  fulfillmentMethod: order.fulfillmentMethod,
  total: order.total.toString(),
  paymentStatus: order.paymentStatus,
  orderStatus: order.orderStatus,
  archivedAt: order.archivedAt?.toISOString() ?? null,
  createdAt: order.createdAt.toISOString(),
})

const toPaymentListItem = (payment: {
  id: string
  orderId: string
  senderName: string
  transactionReference: string | null
  amount: Prisma.Decimal
  transferredAt: Date
  proofUrl: string
  status: PaymentSubmissionStatus
  rejectionReason: import('@prisma/client').PaymentRejectionReason | null
  reviewNote: string | null
  reviewedAt: Date | null
  createdAt: Date
  order: {
    orderNumber: string
    customerName: string
    email: string | null
    phone: string
    total: Prisma.Decimal
    paymentMethod: import('@prisma/client').PaymentMethod
    paymentStatus: PaymentStatus
    orderStatus: OrderStatus
  }
  auditEvents?: Array<{
    id: string
    action: string
    note: string | null
    createdAt: Date
    performedBy: { name: string; email: string } | null
  }>
}): AdminPaymentListItem => ({
  id: payment.id,
  orderId: payment.orderId,
  orderNumber: payment.order.orderNumber,
  customerName: payment.order.customerName,
  customerEmail: payment.order.email,
  customerPhone: payment.order.phone,
  senderName: payment.senderName,
  transactionReference: payment.transactionReference,
  amount: payment.amount.toString(),
  expectedAmount: payment.order.total.toString(),
  paymentMethod: payment.order.paymentMethod,
  orderPaymentStatus: payment.order.paymentStatus,
  orderStatus: payment.order.orderStatus,
  transferredAt: payment.transferredAt.toISOString(),
  proofUrl: payment.proofUrl,
  proofAvailable: Boolean(payment.proofUrl.trim()),
  status: payment.status,
  rejectionReason: payment.rejectionReason,
  reviewNote: payment.reviewNote,
  reviewedAt: payment.reviewedAt?.toISOString() ?? null,
  createdAt: payment.createdAt.toISOString(),
  ...(payment.auditEvents
    ? {
        auditHistory: payment.auditEvents.map((event) => ({
          id: event.id,
          action: event.action,
          note: event.note,
          createdAt: event.createdAt.toISOString(),
          performedBy: event.performedBy,
        })),
      }
    : {}),
})

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

export async function listAdminOrders(query: AdminOrdersQuery): Promise<AdminOrdersPage> {
  const search = query.search
    ? {
        OR: [
          { orderNumber: { contains: query.search, mode: 'insensitive' as const } },
          { customerName: { contains: query.search, mode: 'insensitive' as const } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
          { phone: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }
    : undefined
  const where: Prisma.OrderWhereInput = {
    ...(search ?? {}),
    ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
    ...(query.orderStatus ? { orderStatus: query.orderStatus } : {}),
    ...(query.archive === 'active' ? { archivedAt: null } : {}),
    ...(query.archive === 'archived' ? { NOT: { archivedAt: null } } : {}),
  }
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    select: {
      orderNumber: true,
      customerName: true,
      email: true,
      phone: true,
      fulfillmentMethod: true,
      total: true,
      paymentStatus: true,
      orderStatus: true,
       archivedAt: true,
      createdAt: true,
    },
    }),
  ])
  return {
    orders: orders.map(toOrderListItem),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  }
}

const orderDetailInclude = {
  orderItems: {
    select: {
      id: true,
      productId: true,
      productName: true,
      productOptionId: true,
      productOptionLabel: true,
      unitPrice: true,
      quantity: true,
      subtotal: true,
       deliveryFee: true,
    },
  },
  paymentSubmissions: {
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      senderName: true,
      transactionReference: true,
      amount: true,
      transferredAt: true,
      proofUrl: true,
      status: true,
      reviewNote: true,
      reviewedAt: true,
      createdAt: true,
    },
  },
  statusHistory: {
    orderBy: { createdAt: 'desc' as const },
    include: { changedByUser: { select: { name: true, email: true } } },
  },
  paymentSnapshot: {
    select: {
      paymentMethod: true,
      bankName: true,
      accountName: true,
      accountNumber: true,
      instructions: true,
    },
  },
} satisfies Prisma.OrderInclude

export async function getAdminOrder(orderNumber: string) {
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: orderDetailInclude })
  if (!order) throw new HttpError(404, 'Order not found.')
  return {
    ...order,
    subtotal: order.subtotal.toString(),
    total: order.total.toString(),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    archivedAt: order.archivedAt?.toISOString() ?? null,
    orderItems: order.orderItems.map((item) => ({
      ...item,
      unitPrice: item.unitPrice.toString(),
      subtotal: item.subtotal.toString(),
    })),
    paymentSubmissions: order.paymentSubmissions.map((payment) => ({
      ...payment,
      amount: payment.amount.toString(),
      transferredAt: payment.transferredAt.toISOString(),
      reviewedAt: payment.reviewedAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
    })),
    statusHistory: order.statusHistory.map((history) => ({
      id: history.id,
      previousStatus: history.previousStatus,
      newStatus: history.newStatus,
      changedBy: history.changedByUser,
      note: history.note,
      createdAt: history.createdAt.toISOString(),
    })),
  }
}

const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.ORDER_PLACED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
}

const fulfillmentStatusesRequiringPayment = new Set<OrderStatus>([
  OrderStatus.PROCESSING,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
])

export async function updateAdminOrderStatus(orderNumber: string, input: UpdateOrderStatusInput, adminId: string) {
  const updated = await prisma.$transaction(async (transaction) => {
    const existing = await transaction.order.findUnique({
      where: { orderNumber },
      include: {
        orderItems: { select: { productId: true, productOptionId: true, quantity: true } },
      },
    })
    if (!existing) throw new HttpError(404, 'Order not found.')
    if (existing.orderStatus === input.orderStatus) {
      if (
        input.orderStatus === OrderStatus.CANCELLED &&
        existing.stockDeductedAt &&
        !existing.stockRestoredAt
      ) {
        const restoreClaim = await transaction.order.updateMany({
          where: { id: existing.id, orderStatus: OrderStatus.CANCELLED, stockRestoredAt: null },
          data: { stockRestoredAt: new Date() },
        })
        if (restoreClaim.count !== 1) return existing
        for (const item of existing.orderItems) {
          await restoreStock(transaction, {
            productId: item.productId,
            productOptionId: item.productOptionId ?? null,
            quantity: item.quantity,
            orderId: existing.id,
            orderNumber: existing.orderNumber,
          })
        }
        return transaction.order.findUniqueOrThrow({ where: { id: existing.id } })
      }
      return existing
    }
    if (!allowedTransitions[existing.orderStatus].includes(input.orderStatus)) {
      throw new HttpError(409, `Order status cannot change from ${existing.orderStatus} to ${input.orderStatus}.`)
    }
    if (fulfillmentStatusesRequiringPayment.has(input.orderStatus) && existing.paymentStatus !== PaymentStatus.PAID) {
      throw new HttpError(409, 'Payment must be confirmed before the order can move through fulfilment.')
    }

    const orderUpdate = await transaction.order.updateMany({
      where: { id: existing.id, orderStatus: existing.orderStatus },
      data: {
        orderStatus: input.orderStatus,
        ...(input.orderStatus === OrderStatus.CANCELLED
          ? {
              cancellationReason: input.note ?? existing.cancellationReason,
              cancelledAt: existing.cancelledAt ?? new Date(),
            }
          : {}),
        ...(input.orderStatus === OrderStatus.CANCELLED && existing.stockDeductedAt && !existing.stockRestoredAt
          ? { stockRestoredAt: new Date() }
          : {}),
      },
    })
    if (orderUpdate.count !== 1) {
      throw new HttpError(409, 'The order changed while it was being updated. Please try again.')
    }

    const order = await transaction.order.findUniqueOrThrow({ where: { id: existing.id } })
    await transaction.orderStatusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: existing.orderStatus,
        newStatus: input.orderStatus,
        changedBy: adminId,
        note: input.note ?? null,
      },
    })

    if (input.orderStatus === OrderStatus.CANCELLED && existing.stockDeductedAt && !existing.stockRestoredAt) {
      for (const item of existing.orderItems) {
        await restoreStock(transaction, {
          productId: item.productId,
          productOptionId: item.productOptionId ?? null,
          quantity: item.quantity,
          orderId: order.id,
          orderNumber: order.orderNumber,
        })
      }
    }

    return {
      ...order,
      customerName: existing.customerName,
      email: existing.email,
    }
  }, { timeout: 30000 })

  void notifyOrderStatusChanged({
    orderNumber: updated.orderNumber,
    customerName: updated.customerName,
    customerEmail: updated.email,
    orderStatus: updated.orderStatus,
  }).catch((error: unknown) => console.error('Order status email failed', error))

  return getAdminOrder(orderNumber)
}

export async function archiveAdminOrder(orderNumber: string, adminId: string) {
  const result = await prisma.order.updateMany({
    where: { orderNumber, archivedAt: null },
    data: { archivedAt: new Date(), archivedById: adminId },
  })
  if (result.count === 0) {
    const existing = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true } })
    if (!existing) throw new HttpError(404, 'Order not found.')
  }
  return getAdminOrder(orderNumber)
}

export async function restoreAdminOrder(orderNumber: string) {
  const result = await prisma.order.updateMany({
    where: { orderNumber, archivedAt: { not: null } },
    data: { archivedAt: null, archivedById: null },
  })
  if (result.count === 0) {
    const existing = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true, archivedAt: true } })
    if (!existing) throw new HttpError(404, 'Order not found.')
  }
  return getAdminOrder(orderNumber)
}

export async function deleteAdminOrder(orderNumber: string) {
  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.order.findUnique({
      where: { orderNumber },
      select: {
        id: true,
        archivedAt: true,
        paymentStatus: true,
        orderStatus: true,
        stockDeductedAt: true,
        stockRestoredAt: true,
        paymentSubmissions: { select: { id: true }, take: 1 },
      },
    })
    if (!existing) throw new HttpError(404, 'Order not found.')
    if (!existing.archivedAt) throw new HttpError(409, 'Only archived orders can be permanently deleted.')
    if (existing.paymentStatus !== PaymentStatus.PENDING || existing.paymentSubmissions.length > 0) {
      throw new HttpError(409, 'Orders with payment records cannot be permanently deleted.')
    }
    if (existing.orderStatus !== OrderStatus.CANCELLED || (existing.stockDeductedAt && !existing.stockRestoredAt)) {
      throw new HttpError(409, 'Only cancelled orders with reconciled stock can be permanently deleted.')
    }
    await transaction.order.delete({ where: { id: existing.id } })
  }, { timeout: 30000 })
}

export async function listAdminPayments(query: AdminPaymentsQuery): Promise<AdminPaymentsPage> {
  const search = query.search
    ? {
        OR: [
          { transactionReference: { contains: query.search, mode: 'insensitive' as const } },
          { senderName: { contains: query.search, mode: 'insensitive' as const } },
          { order: { orderNumber: { contains: query.search, mode: 'insensitive' as const } } },
          { order: { customerName: { contains: query.search, mode: 'insensitive' as const } } },
          { order: { email: { contains: query.search, mode: 'insensitive' as const } } },
        ],
      }
    : undefined
  const where: Prisma.PaymentSubmissionWhereInput = {
    ...(search ?? {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.paymentMethod ? { order: { paymentMethod: query.paymentMethod } } : {}),
    ...(query.from || query.to
      ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
      : {}),
  }
  const orderSelect = {
    orderNumber: true,
    customerName: true,
    email: true,
    phone: true,
    total: true,
    paymentMethod: true,
    paymentStatus: true,
    orderStatus: true,
  } satisfies Prisma.OrderSelect
  const [total, payments, grouped] = await Promise.all([
    prisma.paymentSubmission.count({ where }),
    prisma.paymentSubmission.findMany({
      where,
      orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { order: { select: orderSelect } },
    }),
    prisma.paymentSubmission.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ])
  const summary = {
    pending: { count: 0, totalAmount: '0' },
    verified: { count: 0, totalAmount: '0' },
    rejected: { count: 0, totalAmount: '0' },
  }
  grouped.forEach((item) => {
    const key = item.status === PaymentSubmissionStatus.PENDING
      ? 'pending'
      : item.status === PaymentSubmissionStatus.VERIFIED
        ? 'verified'
        : 'rejected'
    summary[key] = { count: item._count._all, totalAmount: item._sum.amount?.toString() ?? '0' }
  })
  return {
    payments: payments.map(toPaymentListItem),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
    summary,
  }
}

export async function getAdminPayment(id: string): Promise<AdminPaymentListItem> {
  const payment = await prisma.paymentSubmission.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          orderNumber: true,
          customerName: true,
          email: true,
          phone: true,
          total: true,
          paymentMethod: true,
          paymentStatus: true,
          orderStatus: true,
        },
      },
      auditEvents: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          action: true,
          note: true,
          createdAt: true,
          performedBy: { select: { name: true, email: true } },
        },
      },
    },
  })
  if (!payment) throw new HttpError(404, 'Payment submission not found.')
  return toPaymentListItem(payment)
}
