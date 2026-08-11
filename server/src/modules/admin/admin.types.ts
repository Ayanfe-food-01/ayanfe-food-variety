import type { OrderStatus, PaymentSubmissionStatus, PaymentStatus } from '@prisma/client'

export interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  pendingPaymentVerification: number
  verifiedPayments: number
  totalSales: string
}

export interface AdminOrderListItem {
  id: string
  customerName: string
  email: string | null
  phone: string
  total: string
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  createdAt: string
}

export interface AdminPaymentListItem {
  id: string
  orderId: string
  customerName: string
  customerEmail: string | null
  amount: string
  senderName: string
  transactionReference: string
  transferredAt: string
  createdAt: string
  status: PaymentSubmissionStatus
  proofUrl: string
  reviewNote: string | null
  reviewedAt: string | null
}

export interface AdminPaymentSettings {
  bankName: string
  accountName: string
  accountNumber: string
  instructions: string
}

export interface UpdateOrderStatusInput {
  orderStatus: OrderStatus
}

export interface UpdatePaymentSettingsInput extends AdminPaymentSettings {}