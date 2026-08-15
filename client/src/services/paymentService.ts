import { ApiError, request } from './api'
import { localDateTimeToIso } from '../utils/browserCompatibility'

export interface BankDetails {
  bankName: string
  accountName: string
  accountNumber: string
  instructions: string
}

export interface PaymentSubmission {
  id: string
  orderId: string
  senderName: string
  transactionReference: string | null
  amount: string
  transferredAt: string
  proofUrl: string
  status: 'PENDING' | 'VERIFIED' | 'REJECTED'
  rejectionReason: PaymentRejectionReason | null
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export type PaymentRejectionReason =
  | 'AMOUNT_MISMATCH'
  | 'PROOF_UNCLEAR'
  | 'TRANSACTION_UNVERIFIED'
  | 'WRONG_ACCOUNT'
  | 'DUPLICATE_PROOF'
  | 'OTHER'

export interface AdminPaymentAudit {
  id: string
  action: string
  note: string | null
  createdAt: string
  performedBy: { name: string; email: string } | null
}

interface BankDetailsResponse {
  success: true
  data: { store: unknown; payment: BankDetails | null }
}

interface PaymentSubmissionResponse {
  success: true
  message: string
  data: { payment: PaymentSubmission }
}

export interface AdminPayment extends PaymentSubmission {
  orderNumber: string
  customerName: string
  customerEmail: string | null
  customerPhone: string
  expectedAmount: string
  paymentMethod: 'BANK_TRANSFER'
  orderPaymentStatus: 'PENDING' | 'PAID' | 'FAILED'
  orderStatus: 'ORDER_PLACED' | 'PROCESSING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
  proofAvailable: boolean
  auditHistory?: AdminPaymentAudit[]
}

export async function getBankDetails(): Promise<BankDetails> {
  const response = await request<BankDetailsResponse>('/store/settings')
  if (!response.data.payment) {
    throw new ApiError('Payment details are not configured yet. Please contact the store before transferring funds.', 503)
  }
  return response.data.payment
}

export async function submitPaymentProof(input: {
  orderId: string
  senderName: string
  transactionReference?: string | null
  amount: string
  transferredAt: string
  proof: File
}): Promise<PaymentSubmission> {
  const formData = new FormData()
  formData.append('orderId', input.orderId)
  formData.append('senderName', input.senderName)
  const transactionReference = input.transactionReference?.trim()
  if (transactionReference) formData.append('transactionReference', transactionReference)
  formData.append('amount', input.amount)
  formData.append('transferredAt', localDateTimeToIso(input.transferredAt))
  formData.append('proof', input.proof)

  const response = await request<PaymentSubmissionResponse>('/payments/submit', {
    method: 'POST',
    body: formData,
  })
  return response.data.payment
}

export interface AdminPaymentsQuery {
  search?: string
  status?: 'PENDING' | 'VERIFIED' | 'REJECTED'
  paymentMethod?: 'BANK_TRANSFER'
  from?: string
  to?: string
  sort?: 'newest' | 'oldest'
  page?: number
  pageSize?: number
}

export interface AdminPaymentsPage {
  payments: AdminPayment[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
  summary: {
    pending: { count: number; totalAmount: string }
    verified: { count: number; totalAmount: string }
    rejected: { count: number; totalAmount: string }
  }
}

interface AdminPaymentsResponse {
  success: true
  data: AdminPaymentsPage
}

interface AdminPaymentResponse {
  success: true
  message?: string
  data: { payment: AdminPayment }
}

export async function getAdminPayments(query: AdminPaymentsQuery = {}): Promise<AdminPaymentsPage> {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const response = await request<AdminPaymentsResponse>(`/admin/payments${params.size ? `?${params.toString()}` : ''}`)
  return response.data
}

export async function getAdminPayment(id: string): Promise<AdminPayment> {
  const response = await request<AdminPaymentResponse>(`/admin/payments/${id}`)
  return response.data.payment
}

export async function verifyAdminPayment(id: string, reviewNote?: string): Promise<AdminPayment> {
  const response = await request<AdminPaymentResponse>(`/admin/payments/${id}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewNote: reviewNote?.trim() || undefined }),
  })
  return response.data.payment
}

export async function rejectAdminPayment(id: string, rejectionReason: PaymentRejectionReason, reviewNote?: string): Promise<AdminPayment> {
  const response = await request<AdminPaymentResponse>(`/admin/payments/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rejectionReason, reviewNote: reviewNote?.trim() || undefined }),
  })
  return response.data.payment
}