import { Prisma } from '@prisma/client'
import type { PaymentRejectionReason, PaymentSubmissionStatus } from '@prisma/client'
import type { BankDetailsResponse, PaymentSubmissionResponse } from './payment.types.js'

export const toResponse = (submission: {
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

export const toBankDetails = (settings: {
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