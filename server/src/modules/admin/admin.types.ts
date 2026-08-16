import type {
  OrderStatus,
  FulfillmentMethod,
  PaymentMethod,
  PaymentRejectionReason,
  PaymentSubmissionStatus,
  PaymentStatus,
} from '@prisma/client'

export interface DashboardStats {
  totalOrders: number
  orderPlacedOrders: number
  processingOrders: number
  deliveredOrders: number
  cancelledOrders: number
  pendingPaymentVerification: number
  verifiedPayments: number
  totalSales: string
}

export type AnalyticsRange = 'today' | 'week' | 'month' | 'year'

export interface RevenuePoint {
  label: string
  revenue: string
  orders: number
}

export interface AdminAnalytics {
  timezone: string
  range: AnalyticsRange
  summary: {
    todayRevenue: string
    weekRevenue: string
    monthRevenue: string
    yearRevenue: string
    totalOrders: number
  }
  metrics: {
    confirmedOrders: number
    pendingOrders: number
    cancelledOrders: number
    averageOrderValue: string
  }
  series: RevenuePoint[]
}

export interface AdminOrderListItem {
  orderNumber: string
  customerName: string
  email: string | null
  phone: string
  fulfillmentMethod: FulfillmentMethod
  total: string
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  archivedAt: string | null
  createdAt: string
}

export type AdminOrderArchiveView = 'active' | 'archived' | 'all'

export interface AdminOrdersQuery {
  search?: string
  paymentStatus?: PaymentStatus
  orderStatus?: OrderStatus
  archive: AdminOrderArchiveView
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
  changedBy: { name: string; email: string } | null
  note: string | null
  createdAt: string
}

export interface AdminPaymentListItem {
  id: string
  orderId: string
  orderNumber: string
  customerName: string
  customerEmail: string | null
  customerPhone: string
  amount: string
  expectedAmount: string
  paymentMethod: PaymentMethod
  orderStatus: OrderStatus
  orderPaymentStatus: PaymentStatus
  senderName: string
  transactionReference: string | null
  transferredAt: string
  createdAt: string
  status: PaymentSubmissionStatus
  proofUrl: string
  proofAvailable: boolean
  rejectionReason: PaymentRejectionReason | null
  reviewNote: string | null
  reviewedAt: string | null
  auditHistory?: AdminPaymentAuditItem[]
}

export interface AdminPaymentAuditItem {
  id: string
  action: string
  note: string | null
  createdAt: string
  performedBy: { name: string; email: string } | null
}

export interface AdminPaymentsQuery {
  search?: string
  status?: PaymentSubmissionStatus
  paymentMethod?: PaymentMethod
  from?: Date
  to?: Date
  sort: 'newest' | 'oldest'
  page: number
  pageSize: number
}

export interface AdminPaymentSummaryItem {
  count: number
  totalAmount: string
}

export interface AdminPaymentSummary {
  pending: AdminPaymentSummaryItem
  verified: AdminPaymentSummaryItem
  rejected: AdminPaymentSummaryItem
}

export interface AdminPaymentsPage {
  payments: AdminPaymentListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  summary: AdminPaymentSummary
}

export interface UpdateOrderStatusInput {
  orderStatus: OrderStatus
  note?: string
}
