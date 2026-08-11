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
  const [totalOrders, pendingOrders, processingOrders, completedOrders, cancelledOrders, pendingPaymentVerification, verifiedPayments, sales] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { orderStatus: OrderStatus.PENDING } }),
      prisma.order.count({ where: { orderStatus: OrderStatus.PROCESSING } }),
      prisma.order.count({ where: { orderStatus: OrderStatus.COMPLETED } }),
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
    pendingOrders,
    processingOrders,
    completedOrders,
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
  [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
}

export async function updateAdminOrderStatus(orderNumber: string, input: UpdateOrderStatusInput, adminId: string) {
  const existing = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      orderStatus: true,
      orderNumber: true,
      customerName: true,
      email: true,
    },
  })
  if (!existing) throw new HttpError(404, 'Order not found.')
  if (existing.orderStatus === input.orderStatus) return getAdminOrder(orderNumber)
  if (!allowedTransitions[existing.orderStatus].includes(input.orderStatus)) {
    throw new HttpError(409, `Order status cannot change from ${existing.orderStatus} to ${input.orderStatus}.`)
  }

  const updated = await prisma.$transaction(async (transaction) => {
    const order = await transaction.order.update({
      where: { id: existing.id },
      data: { orderStatus: input.orderStatus },
    })
    await transaction.orderStatusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: existing.orderStatus,
        newStatus: input.orderStatus,
        changedBy: adminId,
        note: input.note ?? null,
      },
    })
    return order
  })

  void notifyOrderStatusChanged({
    orderNumber: existing.orderNumber,
    customerName: existing.customerName,
    customerEmail: existing.email,
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
