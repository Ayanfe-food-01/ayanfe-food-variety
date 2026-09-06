import { AdminNotificationType, PaymentAuditAction, PaymentStatus, PaymentSubmissionStatus } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { notifyPaymentReviewed } from './payment.email.js'
import type { PaymentSubmissionResponse, ReviewPaymentInput } from './payment.types.js'
import { createAdminNotification } from '../notifications/notification.service.js'
import { toResponse } from './payment.mapper.js'

export async function listPendingPayments(): Promise<PaymentSubmissionResponse[]> {
  const submissions = await prisma.paymentSubmission.findMany({
    where: { status: PaymentSubmissionStatus.PENDING },
    orderBy: { createdAt: 'asc' },
  })
  return submissions.map(toResponse)
}

export async function getPaymentSubmission(id: string): Promise<PaymentSubmissionResponse> {
  const submission = await prisma.paymentSubmission.findUnique({ where: { id } })
  if (!submission) throw new HttpError(404, 'Payment submission not found.')
  return toResponse(submission)
}

export async function reviewPayment(
  id: string,
  verified: boolean,
  input: ReviewPaymentInput,
  adminId: string,
): Promise<PaymentSubmissionResponse> {
  const result = await prisma.$transaction(async (transaction) => {
    const submission = await transaction.paymentSubmission.findUnique({ where: { id } })
    if (!submission) throw new HttpError(404, 'Payment submission not found.')
    if (submission.status !== PaymentSubmissionStatus.PENDING) {
      throw new HttpError(409, 'This payment submission has already been reviewed.')
    }

    const order = await transaction.order.findUnique({ where: { id: submission.orderId } })
    if (!order) throw new HttpError(404, 'Order not found.')
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new HttpError(409, 'This order payment has already been confirmed.')
    }

    const claimed = await transaction.paymentSubmission.updateMany({
      where: { id, status: PaymentSubmissionStatus.PENDING },
      data: {
        status: verified ? PaymentSubmissionStatus.VERIFIED : PaymentSubmissionStatus.REJECTED,
        rejectionReason: verified ? null : input.rejectionReason,
        reviewNote: input.reviewNote ?? null,
        reviewedAt: new Date(),
      },
    })
    if (claimed.count !== 1) throw new HttpError(409, 'This payment submission has already been reviewed.')

    await transaction.order.update({
      where: { id: order.id },
      data: { paymentStatus: verified ? PaymentStatus.PAID : PaymentStatus.FAILED },
    })
    await transaction.paymentAuditEvent.create({
      data: {
        paymentSubmissionId: id,
        action: verified ? PaymentAuditAction.PAYMENT_CONFIRMED : PaymentAuditAction.PAYMENT_REJECTED,
        performedById: adminId,
        note: input.reviewNote ?? input.rejectionReason ?? null,
      },
    })
    if (verified) {
      await createAdminNotification(transaction, {
        type: AdminNotificationType.PAYMENT_CONFIRMED,
        eventKey: `payment-confirmed:${id}`,
        title: 'Payment confirmed',
        message: `Payment for order ${order.orderNumber} was confirmed.`,
        href: `/admin/payments/${id}`,
      })
    }
    const updated = await transaction.paymentSubmission.findUniqueOrThrow({ where: { id } })
    return {
      submission: toResponse(updated),
      customerEmail: order.email,
      orderId: order.id,
      rejectionReason: input.rejectionReason ?? null,
    }
  })

  void notifyPaymentReviewed({
    id: result.orderId,
    customerEmail: result.customerEmail,
    verified,
    reviewNote: input.reviewNote ?? null,
    rejectionReason: result.rejectionReason,
  }).catch((error: unknown) => console.error('Payment review email failed', error))

  return result.submission
}