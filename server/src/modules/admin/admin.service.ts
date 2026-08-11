import { OrderStatus, PaymentSubmissionStatus, PaymentStatus, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type {
  AdminOrderListItem,
  AdminPaymentListItem,
  AdminPaymentSettings,
  DashboardStats,
  UpdateOrderStatusInput,
  UpdatePaymentSettingsInput,
} from './admin.types.js'
import { notifyOrderStatusChanged } from '../orders/order.email.js'

const toOrderListItem = (order: {
  id: string
  customerName: string
  email: string | null
  phone: string
  total: Prisma.Decimal
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  createdAt: Date
}): AdminOrderListItem => ({
  id: order.id,
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
  const [totalOrders, pendingOrders, pendingPaymentVerification, verifiedPayments, sales] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { orderStatus: OrderStatus.PENDING } }),
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
    pendingPaymentVerification,
    verifiedPayments,
    totalSales: sales._sum.total?.toString() ?? '0',
  }
}

export async function listAdminOrders(): Promise<AdminOrderListItem[]> {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      customerName: true,
      email: true,
      phone: true,
      total: true,
      paymentStatus: true,
      orderStatus: true,
      createdAt: true,
    },
  })
  return orders.map(toOrderListItem)
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
} satisfies Prisma.OrderInclude

export async function getAdminOrder(id: string) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderDetailInclude })
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
  }
}

export async function updateAdminOrderStatus(id: string, input: UpdateOrderStatusInput) {
  const existing = await prisma.order.findUnique({
    where: { id },
    select: {
      orderStatus: true,
      orderNumber: true,
      customerName: true,
      email: true,
    },
  })
  if (!existing) throw new HttpError(404, 'Order not found.')
  if (existing.orderStatus === input.orderStatus) return getAdminOrder(id)

  const updated = await prisma.order.update({
    where: { id },
    data: { orderStatus: input.orderStatus },
  })

  void notifyOrderStatusChanged({
    orderNumber: existing.orderNumber,
    customerName: existing.customerName,
    customerEmail: existing.email,
    orderStatus: updated.orderStatus,
  }).catch((error: unknown) => console.error('Order status email failed', error))

  return getAdminOrder(id)
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

const toSettings = (settings: {
  bankName: string
  accountName: string
  accountNumber: string
  instructions: string
}): AdminPaymentSettings => ({
  bankName: settings.bankName,
  accountName: settings.accountName,
  accountNumber: settings.accountNumber,
  instructions: settings.instructions,
})

export async function getAdminPaymentSettings(): Promise<AdminPaymentSettings | null> {
  const settings = await prisma.paymentSettings.findUnique({ where: { singletonKey: 'default' } })
  return settings ? toSettings(settings) : null
}

export async function updateAdminPaymentSettings(input: UpdatePaymentSettingsInput): Promise<AdminPaymentSettings> {
  const settings = await prisma.paymentSettings.upsert({
    where: { singletonKey: 'default' },
    create: { singletonKey: 'default', ...input, isActive: true },
    update: { ...input, isActive: true },
  })
  return toSettings(settings)
}