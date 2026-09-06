import type { PaymentProvider, PaymentRecordStatus, PaymentRejectionReason, PaymentSubmissionStatus } from '@prisma/client'

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

// Response returned to the frontend after initializing an online payment.
// Contains only public-safe data needed to begin payment; never a secret key.
export interface PaymentInitResponse {
  orderId: string
  provider: PaymentProvider
  providerReference: string
  authorizationUrl: string
  amount: string
  currency: string
  status: PaymentRecordStatus
}

// Response returned after verifying an online payment. The `status` is the
// confirmed/latest state of the hosted Payment record, which the frontend maps
// to its success / retry / unconfirmed states. The client must never infer this
// from the gateway return URL.
export interface PaymentVerifyResponse {
  orderId: string
  orderNumber: string
  provider: PaymentProvider
  providerReference: string
  status: PaymentRecordStatus
  /** Aggregated order payment status after verification. */
  paymentStatus: 'PENDING' | 'PAID'
  amount: string
  currency: string
  paidAt: string | null
}