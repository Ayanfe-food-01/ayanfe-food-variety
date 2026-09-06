import { OrderStatus, PaymentStatus, PaymentSubmissionStatus, Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { AdminPaymentListItem, AdminPaymentsPage, AdminPaymentsQuery } from './admin.types.js'

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
