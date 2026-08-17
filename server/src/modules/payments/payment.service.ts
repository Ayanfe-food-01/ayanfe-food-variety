import { AdminNotificationType, PaymentAuditAction, PaymentStatus, PaymentSubmissionStatus, Prisma } from '@prisma/client'
import type { PaymentRejectionReason } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import { notifyPaymentReviewed, notifyPaymentSubmitted } from './payment.email.js'
import { deletePaymentProof, uploadPaymentProof } from './payment.storage.js'
import { getPublicPaymentSettings } from '../settings/settings.service.js'
import { hashGuestOrderAccessToken } from '../../utils/guestOrderAccess.js'
import type {
  BankDetailsResponse,
  PaymentSubmissionResponse,
  ReviewPaymentInput,
  SubmitPaymentInput,
} from './payment.types.js'
import { createAdminNotification } from '../notifications/notification.service.js'

const toResponse = (submission: {
  id: string
  orderId: string
  senderName: string
  transactionReference: string | null
  amount: Prisma.Decimal
  transferredAt: Date
  proofUrl: string
  status: PaymentSubmissionStatus
  rejectionReason: PaymentRejectionReason | null
  reviewNote: string | null
  reviewedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): PaymentSubmissionResponse => ({
  id: submission.id,
  orderId: submission.orderId,
  senderName: submission.senderName,
  transactionReference: submission.transactionReference,
  amount: submission.amount.toString(),
  transferredAt: submission.transferredAt.toISOString(),
  proofUrl: submission.proofUrl,
  status: submission.status,
  rejectionReason: submission.rejectionReason,
  reviewNote: submission.reviewNote,
  reviewedAt: submission.reviewedAt?.toISOString() ?? null,
  createdAt: submission.createdAt.toISOString(),
  updatedAt: submission.updatedAt.toISOString(),
})

const toBankDetails = (settings: {
  bankName: string
  accountName: string
  accountNumber: string
  instructions: string
}): BankDetailsResponse => ({
  bankName: settings.bankName,
  accountName: settings.accountName,
  accountNumber: settings.accountNumber,
  instructions: settings.instructions,
})

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