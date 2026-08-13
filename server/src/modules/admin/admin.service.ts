import { OrderStatus, PaymentSubmissionStatus, PaymentStatus, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type {
  AdminOrderListItem,
  AdminOrdersPage,
  AdminOrdersQuery,
  AdminPaymentListItem,
  DashboardStats,
  UpdateOrderStatusInput,
} from './admin.types.js'
import { notifyOrderStatusChanged } from '../orders/order.email.js'
import { restoreStock } from '../inventory/inventory.service.js'

const toOrderListItem = (order: {
  orderNumber: string
  customerName: string
  email: string | null
  phone: string
  total: Prisma.Decimal
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  createdAt: Date
}): AdminOrderListItem => ({
  orderNumber: order.orderNumber,
  customerName: order.customerName,
  email: order.email,
  phone: order.phone,
  total: order.total.toString(),
  paymentStatus: order.paymentStatus,
  orderStatus: order.orderStatus,
  createdAt: order.createdAt.toISOString(),
})

const toPaymentListItem = (payment: {
  id: string
  orderId: string
  senderName: string
  transactionReference: string
  amount: Prisma.Decimal
  transferredAt: Date
  proofUrl: string
  status: PaymentSubmissionStatus
  reviewNote: string | null
  reviewedAt: Date | null
  createdAt: Date
  order: { customerName: string; email: string | null }
}): AdminPaymentListItem => ({
  id: payment.id,
  orderId: payment.orderId,
  customerName: payment.order.customerName,
  customerEmail: payment.order.email,
  senderName: payment.senderName,
  transactionReference: payment.transactionReference,
  amount: payment.amount.toString(),
  transferredAt: payment.transferredAt.toISOString(),
  proofUrl: payment.proofUrl,
  status: payment.status,
  reviewNote: payment.reviewNote,
  reviewedAt: payment.reviewedAt?.toISOString() ?? null,
  createdAt: payment.createdAt.toISOString(),
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
        where: { paymentStatus: PaymentStatus.PAID },
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
      total: true,
      paymentStatus: true,
      orderStatus: true,
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
        orderItems: { select: { productId: true, quantity: true } },
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
  })

  void notifyOrderStatusChanged({
    orderNumber: updated.orderNumber,
    customerName: updated.customerName,
    customerEmail: updated.email,
    orderStatus: updated.orderStatus,
  }).catch((error: unknown) => console.error('Order status email failed', error))

  return getAdminOrder(orderNumber)
}

export async function listAdminPayments(status?: PaymentSubmissionStatus): Promise<AdminPaymentListItem[]> {
  const payments = await prisma.paymentSubmission.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { order: { select: { customerName: true, email: true } } },
  })
  return payments.map(toPaymentListItem)
}

export async function getAdminPayment(id: string): Promise<AdminPaymentListItem> {
  const payment = await prisma.paymentSubmission.findUnique({
    where: { id },
    include: { order: { select: { customerName: true, email: true } } },
  })
  if (!payment) throw new HttpError(404, 'Payment submission not found.')
  return toPaymentListItem(payment)
}
