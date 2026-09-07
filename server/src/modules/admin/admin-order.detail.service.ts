import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'

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
    deliveryFee: order.deliveryFee.toString(),
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