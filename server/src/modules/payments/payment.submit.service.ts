import { AdminNotificationType, PaymentAuditAction, PaymentStatus, PaymentSubmissionStatus, Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { notifyPaymentSubmitted } from './payment.email.js'
import { deletePaymentProof, uploadPaymentProof } from './payment.storage.js'
import { getPublicPaymentSettings } from '../settings/settings.service.js'
import { hashGuestOrderAccessToken } from '../../utils/guestOrderAccess.js'
import type { BankDetailsResponse, PaymentSubmissionResponse, SubmitPaymentInput } from './payment.types.js'
import { createAdminNotification } from '../notifications/notification.service.js'
import { toBankDetails, toResponse } from './payment.mapper.js'

export async function getBankDetails(): Promise<BankDetailsResponse> {
  const settings = await getPublicPaymentSettings()
  if (!settings) throw new HttpError(503, 'Payment settings are not configured yet.')
  return toBankDetails(settings)
}

export async function submitPayment(
  input: SubmitPaymentInput,
  file: Express.Multer.File | undefined,
  authenticatedUserId?: string,
  guestAccessToken?: string,
): Promise<PaymentSubmissionResponse> {
  if (!file) throw new HttpError(400, 'A payment receipt image is required.')
  const order = await prisma.order.findUnique({ where: { id: input.orderId } })
  const ownsOrder = authenticatedUserId
    ? order?.userId === authenticatedUserId
    : Boolean(guestAccessToken && order?.userId === null && order.guestAccessTokenHash === hashGuestOrderAccessToken(guestAccessToken))
  if (!order || !ownsOrder) {
    throw new HttpError(authenticatedUserId || guestAccessToken ? 404 : 401, 'Order not found.')
  }
  if (order.paymentStatus === PaymentStatus.PAID) {
    throw new HttpError(409, 'This order has already been paid.')
  }
  if (order.orderStatus === 'CANCELLED') {
    throw new HttpError(409, 'Payment proof cannot be submitted for a cancelled order.')
  }
  const pendingSubmission = await prisma.paymentSubmission.findFirst({
    where: { orderId: order.id, status: PaymentSubmissionStatus.PENDING },
  })
  if (pendingSubmission) throw new HttpError(409, 'A payment proof for this order is already awaiting review.')

  const amount = new Prisma.Decimal(input.amount)
  const uploadedProof = await uploadPaymentProof(file, order.id)
  let submission
  try {
    submission = await prisma.$transaction(async (transaction) => {
      const created = await transaction.paymentSubmission.create({
        data: {
          orderId: order.id,
          senderName: input.senderName,
          transactionReference: input.transactionReference?.trim() || null,
          amount,
          transferredAt: new Date(input.transferredAt),
          proofUrl: uploadedProof.url,
          status: PaymentSubmissionStatus.PENDING,
        },
      })
      await transaction.paymentAuditEvent.create({
        data: {
          paymentSubmissionId: created.id,
          action: PaymentAuditAction.PROOF_SUBMITTED,
          performedById: authenticatedUserId,
        },
      })
      await createAdminNotification(transaction, {
        type: AdminNotificationType.PAYMENT_PROOF_SUBMITTED,
        eventKey: `payment-proof-submitted:${created.id}`,
        title: 'Payment proof submitted',
        message: `Payment proof for order ${order.orderNumber} is awaiting review.`,
        href: `/admin/payments/${created.id}`,
      })
      return created
    })
  } catch (error: unknown) {
    await deletePaymentProof(uploadedProof.publicId)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'A payment proof for this order is already awaiting review.')
    }
    throw error
  }

  void notifyPaymentSubmitted({
    id: order.id,
    customerName: order.customerName,
    total: order.total.toString(),
    transactionReference: input.transactionReference?.trim() || null,
    transferredAt: new Date(input.transferredAt).toISOString(),
  }).catch((error: unknown) => console.error('Payment submission email failed', error))

  return toResponse(submission)
}