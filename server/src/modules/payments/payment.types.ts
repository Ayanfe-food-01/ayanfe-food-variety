import type { PaymentRejectionReason, PaymentSubmissionStatus } from '@prisma/client'

export interface SubmitPaymentInput {
  orderId: string
  senderName: string
  transactionReference?: string | null
  amount: string
  transferredAt: string
}

export interface ReviewPaymentInput {
  rejectionReason?: PaymentRejectionReason
  reviewNote?: string
}

export interface PaymentSubmissionResponse {
  id: string
  orderId: string
  senderName: string
  transactionReference: string | null
  amount: string
  transferredAt: string
  proofUrl: string
  status: PaymentSubmissionStatus
  rejectionReason: PaymentRejectionReason | null
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface BankDetailsResponse {
  bankName: string
  accountName: string
  accountNumber: string
  instructions: string
}