import { OrderStatus, PaymentProvider, PaymentStatus, PaymentSubmissionStatus, Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { buildSearchWhere, type SearchFieldConfig } from '../../utils/search.js'
import type {
  AdminPaymentListItem,
  AdminPaymentListStatus,
  AdminPaymentMethodBreakdown,
  AdminPaymentSummaryItem,
  AdminPaymentsPage,
  AdminPaymentsQuery,
} from './admin.types.js'

const ADMIN_PAYMENT_SEARCH_FIELDS: SearchFieldConfig[] = [
  { path: 'transactionReference', primary: true, weight: 2 },
  { path: 'senderName', primary: true, weight: 1.5 },
  { path: 'order.orderNumber', primary: true, weight: 1.5 },
  { path: 'order.customerName', weight: 1.2 },
  { path: 'order.email', weight: 0.6 },
]

const ADMIN_PAYSTACK_SEARCH_FIELDS: SearchFieldConfig[] = [
  { path: 'providerReference', primary: true, weight: 2 },
  { path: 'order.orderNumber', primary: true, weight: 1.5 },
  { path: 'order.customerName', weight: 1.2 },
  { path: 'order.email', weight: 0.6 },
]

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

const submissionToListItem = (payment: {
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

const paystackToListItem = (payment: {
  id: string
  orderId: string
  provider: PaymentProvider
  providerReference: string
  amount: Prisma.Decimal
  currency: string
  method: string | null
  initializedAt: Date
  completedAt: Date | null
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
}): AdminPaymentListItem => {
  const paidAt = payment.completedAt ?? payment.initializedAt
  return {
    id: payment.id,
    orderId: payment.orderId,
    orderNumber: payment.order.orderNumber,
    customerName: payment.order.customerName,
    customerEmail: payment.order.email,
    customerPhone: payment.order.phone,
    senderName: null,
    transactionReference: null,
    amount: payment.amount.toString(),
    expectedAmount: payment.order.total.toString(),
    paymentMethod: 'PAYSTACK',
    orderPaymentStatus: payment.order.paymentStatus,
    orderStatus: payment.order.orderStatus,
    transferredAt: null,
    proofUrl: '',
    proofAvailable: false,
    status: 'SUCCESSFUL',
    rejectionReason: null,
    reviewNote: null,
    reviewedAt: null,
    createdAt: paidAt.toISOString(),
    providerReference: payment.providerReference,
    channel: payment.method,
    paidAt: paidAt.toISOString(),
    currency: payment.currency,
  }
}

const mapSubmissionStatus = (status: AdminPaymentListStatus | undefined): PaymentSubmissionStatus | undefined => {
  switch (status) {
    case 'PENDING': return PaymentSubmissionStatus.PENDING
    case 'CONFIRMED':
    case 'VERIFIED': return PaymentSubmissionStatus.VERIFIED
    case 'REJECTED': return PaymentSubmissionStatus.REJECTED
    default: return undefined
  }
}

function paymentMethodBreakdown(
  verifiedGroup: { _count: { _all: number }; _sum: { amount: Prisma.Decimal | null } } | undefined,
  paystackConfirmed: AdminPaymentSummaryItem,
): AdminPaymentMethodBreakdown {
  return {
    bankTransfer: {
      count: verifiedGroup?._count._all ?? 0,
      totalAmount: (verifiedGroup?._sum.amount ?? 0).toString(),
    },
    paystack: paystackConfirmed,
  }
}

export async function listAdminPayments(query: AdminPaymentsQuery): Promise<AdminPaymentsPage> {
  const wantsSubmissions = query.paymentMethod !== 'PAYSTACK'
  const wantsPaystack = query.paymentMethod !== 'BANK_TRANSFER'

  const includeSubmissions = wantsSubmissions && (query.status === undefined || query.status === 'CONFIRMED' || ['PENDING', 'VERIFIED', 'REJECTED'].includes(query.status))
  const includePaystack = wantsPaystack && (query.status === undefined || query.status === 'CONFIRMED' || query.status === 'SUCCESSFUL')

  const submissionStatus = mapSubmissionStatus(query.status)

  const submissionSearch = buildSearchWhere<Prisma.PaymentSubmissionWhereInput>(query.search, ADMIN_PAYMENT_SEARCH_FIELDS)
  const submissionWhere: Prisma.PaymentSubmissionWhereInput = {
    ...(submissionSearch ?? {}),
    ...(submissionStatus ? { status: submissionStatus } : {}),
    ...(query.from || query.to
      ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
      : {}),
  }

  const paystackSearch = buildSearchWhere<Prisma.PaymentWhereInput>(query.search, ADMIN_PAYSTACK_SEARCH_FIELDS)
  const paystackWhere: Prisma.PaymentWhereInput = {
    provider: PaymentProvider.PAYSTACK,
    status: 'SUCCESSFUL',
    ...(paystackSearch ?? {}),
    ...(query.from || query.to
      ? { completedAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
      : {}),
  }

  const orderBy = query.sort === 'oldest' ? 'asc' : 'desc'

  const [submissionTotal, paystackTotal, submissionRows, paystackRows, submissionGroups, paystackAggregate] = await Promise.all([
    includeSubmissions ? prisma.paymentSubmission.count({ where: submissionWhere }) : 0,
    includePaystack ? prisma.payment.count({ where: paystackWhere }) : 0,
    includeSubmissions
      ? prisma.paymentSubmission.findMany({
          where: submissionWhere,
          orderBy: { createdAt: orderBy },
          include: { order: { select: orderSelect } },
        })
      : [],
    includePaystack
      ? prisma.payment.findMany({
          where: paystackWhere,
          orderBy: { completedAt: orderBy },
          include: { order: { select: orderSelect } },
        })
      : [],
    prisma.paymentSubmission.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { provider: PaymentProvider.PAYSTACK, status: 'SUCCESSFUL' },
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ])

  const submissionItems = submissionRows.map(submissionToListItem)
  const paystackItems = paystackRows.map(paystackToListItem)
  const allItems = [...submissionItems, ...paystackItems]
  allItems.sort((a, b) => {
    const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (timeDiff !== 0) return timeDiff
    return query.sort === 'oldest' ? (a.id < b.id ? -1 : 1) : (a.id < b.id ? 1 : -1)
  })

  const total = submissionTotal + paystackTotal
  const start = (query.page - 1) * query.pageSize
  const pageItems = allItems.slice(start, start + query.pageSize)

  const pendingGroup = submissionGroups.find((group) => group.status === PaymentSubmissionStatus.PENDING)
  const verifiedGroup = submissionGroups.find((group) => group.status === PaymentSubmissionStatus.VERIFIED)
  const rejectedGroup = submissionGroups.find((group) => group.status === PaymentSubmissionStatus.REJECTED)

  const paystackConfirmed: AdminPaymentSummaryItem = {
    count: paystackAggregate._count._all,
    totalAmount: (paystackAggregate._sum.amount ?? 0).toString(),
  }
  const verifiedSubmissions: AdminPaymentSummaryItem = {
    count: verifiedGroup?._count._all ?? 0,
    totalAmount: (verifiedGroup?._sum.amount ?? 0).toString(),
  }
  const confirmed: AdminPaymentSummaryItem = {
    count: verifiedSubmissions.count + paystackConfirmed.count,
    totalAmount: (Number(verifiedSubmissions.totalAmount) + Number(paystackConfirmed.totalAmount)).toString(),
  }

  return {
    payments: pageItems,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
    summary: {
      pending: {
        count: pendingGroup?._count._all ?? 0,
        totalAmount: (pendingGroup?._sum.amount ?? 0).toString(),
      },
      verified: confirmed,
      rejected: {
        count: rejectedGroup?._count._all ?? 0,
        totalAmount: (rejectedGroup?._sum.amount ?? 0).toString(),
      },
      methodBreakdown: paymentMethodBreakdown(verifiedGroup, paystackConfirmed),
    },
  }
}

export async function getAdminPayment(id: string): Promise<AdminPaymentListItem> {
  const [submission, payment] = await Promise.all([
    prisma.paymentSubmission.findUnique({
      where: { id },
      include: {
        order: { select: orderSelect },
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
    }),
    prisma.payment.findUnique({
      where: { id },
      include: { order: { select: orderSelect } },
    }),
  ])

  if (submission) return submissionToListItem(submission)
  if (payment && payment.provider === PaymentProvider.PAYSTACK && payment.status === 'SUCCESSFUL') {
    return paystackToListItem(payment)
  }
  throw new HttpError(404, 'Payment not found.')
}