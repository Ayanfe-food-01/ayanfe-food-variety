import { Prisma, PaymentStatus } from '@prisma/client'
import type {
  CustomerPaymentSubmissionResponse,
  GuestOrderResponse,
  OrderItemResponse,
  OrderResponse,
} from './order.types.js'

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    orderItems: {
      include: {
        product: {
          select: {
            id: true
            slug: true
            image: true
          }
        }
      }
    }
    paymentSubmissions: {
      select: {
        id: true
        senderName: true
        transactionReference: true
        amount: true
        transferredAt: true
        proofUrl: true
        status: true
         reviewNote: true
        reviewedAt: true
        createdAt: true
      }
      orderBy: {
        createdAt: 'desc'
      }
    }
    paymentSnapshot: {
      select: {
        paymentMethod: true
        bankName: true
        accountName: true
        accountNumber: true
        instructions: true
      }
    }
    statusHistory: {
      orderBy: {
        createdAt: 'asc'
      }
      select: {
        previousStatus: true
        newStatus: true
        createdAt: true
      }
    }
    quoteRequest: {
      select: {
        quoteNumber: true
      }
    }
  }
}>

export const toPaymentSubmissionResponse = (
  submission: OrderWithItems['paymentSubmissions'][number],
): CustomerPaymentSubmissionResponse => ({
  id: submission.id,
  senderName: submission.senderName,
  transactionReference: submission.transactionReference,
  amount: submission.amount.toString(),
  transferredAt: submission.transferredAt.toISOString(),
  proofUrl: submission.proofUrl,
  status: submission.status,
  reviewNote: submission.reviewNote,
  reviewedAt: submission.reviewedAt?.toISOString() ?? null,
  createdAt: submission.createdAt.toISOString(),
})

export const toOrderResponse = (order: OrderWithItems): OrderResponse => {
  const latestPayment = order.paymentSubmissions[0]
  const paymentStatus = order.paymentStatus === PaymentStatus.PAID
    ? 'PAID'
    : latestPayment?.status === 'PENDING'
      ? 'PENDING'
      : order.paymentStatus === PaymentStatus.FAILED || latestPayment?.status === 'REJECTED'
        ? 'REJECTED'
        : 'PENDING'

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    quoteNumber: order.quoteRequest?.quoteNumber ?? null,
    customerName: order.customerName,
    phone: order.phone,
    whatsapp: order.whatsapp,
    fulfillmentMethod: order.fulfillmentMethod,
    email: order.email,
    deliveryAddress: order.deliveryAddress,
    city: order.city,
    state: order.state,
    note: order.note,
    orderType: order.shoppingMode,
    subtotal: order.subtotal.toString(),
    deliveryFee: order.deliveryFee.toString(),
    deliveryZoneName: order.deliveryZoneName,
    deliveryZoneId: order.deliveryZoneId,
    deliveryAreaName: order.deliveryAreaName,
    deliveryAreaId: order.deliveryAreaId,
    deliveryMinDays: order.deliveryMinDays,
    deliveryMaxDays: order.deliveryMaxDays,
    total: order.total.toString(),
    paymentMethod: order.paymentMethod,
    paymentStatus,
    paymentConfirmedAt: order.paymentConfirmedAt?.toISOString() ?? null,
    orderStatus: order.orderStatus,
    cancellationReason: order.cancellationReason,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    orderItems: order.orderItems.map(
      (item): OrderItemResponse => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productOptionId: item.productOptionId,
        productOptionLabel: item.productOptionLabel,
        unitPrice: item.unitPrice.toString(),
        quantity: item.quantity,
        subtotal: item.subtotal.toString(),
         deliveryFee: item.deliveryFee.toString(),
        product: item.product,
      }),
    ),
    paymentSubmissions: order.paymentSubmissions.map(toPaymentSubmissionResponse),
    payment: order.paymentSnapshot,
    statusHistory: order.statusHistory.map((history) => ({
      previousStatus: history.previousStatus,
      newStatus: history.newStatus,
      createdAt: history.createdAt.toISOString(),
    })),
  }
}

export const orderInclude = {
  orderItems: {
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          image: true,
        },
      },
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
  paymentSnapshot: {
    select: {
      paymentMethod: true,
      bankName: true,
      accountName: true,
      accountNumber: true,
      instructions: true,
    },
  },
  statusHistory: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      previousStatus: true,
      newStatus: true,
      createdAt: true,
    },
  },
  quoteRequest: {
    select: {
      quoteNumber: true,
    },
  },
} satisfies Prisma.OrderInclude

export const normalizeGuestPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  return digits.startsWith('234') && digits.length === 13
    ? `0${digits.slice(3)}`
    : digits.startsWith('00234') && digits.length === 15
      ? `0${digits.slice(5)}`
      : digits
}

export const normalizeGuestContact = (value: string): { email: string; phone: string } => {
  const trimmed = value.trim().toLowerCase()

  return { email: trimmed, phone: normalizeGuestPhone(trimmed) }
}

export const toGuestOrderResponse = (order: OrderWithItems): GuestOrderResponse => {
  const fullResponse = toOrderResponse(order)
  const verifiedPayment = order.paymentSubmissions.find((submission) => submission.status === 'VERIFIED')

  return {
    orderNumber: fullResponse.orderNumber,
    fulfillmentMethod: fullResponse.fulfillmentMethod,
    orderType: fullResponse.orderType,
    deliveryAddress: fullResponse.deliveryAddress,
    city: fullResponse.city,
    state: fullResponse.state,
    subtotal: fullResponse.subtotal,
    deliveryFee: fullResponse.deliveryFee,
    deliveryZoneName: fullResponse.deliveryZoneName,
    deliveryMinDays: fullResponse.deliveryMinDays,
    deliveryMaxDays: fullResponse.deliveryMaxDays,
    total: fullResponse.total,
    paymentStatus: fullResponse.paymentStatus,
    paymentConfirmedAt: fullResponse.paymentConfirmedAt
      ?? verifiedPayment?.reviewedAt?.toISOString()
      ?? null,
    orderStatus: fullResponse.orderStatus,
    createdAt: fullResponse.createdAt,
    orderItems: fullResponse.orderItems.map((item) => ({
      id: item.id,
      productName: item.productName,
      productOptionLabel: item.productOptionLabel,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
      deliveryFee: item.deliveryFee,
      image: item.product.image,
    })),
    statusHistory: fullResponse.statusHistory,
  }
}

export const nextOrderNumber = async (transaction: Prisma.TransactionClient): Promise<string> => {
  const result = await transaction.$queryRaw<Array<{ nextval: bigint }>>(
    Prisma.sql`SELECT nextval('orders_order_number_seq')`,
  )
  const sequence = Number(result[0]?.nextval)
  return `AFV-${new Date().getUTCFullYear()}-${String(sequence).padStart(6, '0')}`
}
