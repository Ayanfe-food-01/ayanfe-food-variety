import type { OrderStatus, PaymentSubmissionStatus, PaymentStatus } from '@prisma/client'

export interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  processingOrders: number
  completedOrders: number
  cancelledOrders: number
  pendingPaymentVerification: number
  verifiedPayments: number
  totalSales: string
}

export interface AdminOrderListItem {
  orderNumber: string
  customerName: string
  email: string | null
  phone: string
  total: string
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  createdAt: string
}

export interface AdminOrdersQuery {
  search?: string
  paymentStatus?: PaymentStatus
  orderStatus?: OrderStatus
  sort: 'newest' | 'oldest'
  page: number
  pageSize: number
}

export interface AdminOrdersPage {
  orders: AdminOrderListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface AdminOrderStatusHistory {
  id: string
  previousStatus: OrderStatus | null
  newStatus: OrderStatus
  changedBy: { name: string; email: string }
  note: string | null
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

export interface UpdateOrderStatusInput {
  orderStatus: OrderStatus
  note?: string
}
