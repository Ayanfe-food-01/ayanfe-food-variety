import { ApiError, request } from './api'

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
  transactionReference: string
  amount: string
  transferredAt: string
  proofUrl: string
  status: 'PENDING' | 'VERIFIED' | 'REJECTED'
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
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
  customerName: string
  customerEmail: string | null
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
  transactionReference: string
  amount: string
  transferredAt: string
  proof: File
}): Promise<PaymentSubmission> {
  const formData = new FormData()
  formData.append('orderId', input.orderId)
  formData.append('senderName', input.senderName)
  formData.append('transactionReference', input.transactionReference)
  formData.append('amount', input.amount)
  formData.append('transferredAt', new Date(input.transferredAt).toISOString())
  formData.append('proof', input.proof)

  const response = await request<PaymentSubmissionResponse>('/payments/submit', {
    method: 'POST',
    body: formData,
  })
  return response.data.payment
}

interface AdminPaymentsResponse {
  success: true
  data: { payments: AdminPayment[] }
}

interface AdminPaymentResponse {
  success: true
  message?: string
  data: { payment: AdminPayment }
}

export async function getAdminPayments(status = 'PENDING'): Promise<AdminPayment[]> {
  const response = await request<AdminPaymentsResponse>(`/admin/payments?status=${status}`)
  return response.data.payments
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

export async function rejectAdminPayment(id: string, reviewNote: string): Promise<AdminPayment> {
  const response = await request<AdminPaymentResponse>(`/admin/payments/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewNote }),
  })
  return response.data.payment
}