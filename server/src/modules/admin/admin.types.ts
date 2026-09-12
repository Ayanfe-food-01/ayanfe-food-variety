import type {
  OrderStatus,
  FulfillmentMethod,
  PaymentMethod,
  PaymentRejectionReason,
  PaymentSubmissionStatus,
  PaymentStatus,
  ShoppingMode,
} from '@prisma/client'

export interface DashboardRecentOrder {
  orderNumber: string
  customerName: string
  total: string
  orderStatus: OrderStatus
  paymentStatus: PaymentStatus
  itemCount: number
  createdAt: string
}

export interface DashboardTopProduct {
  productName: string
  unitsSold: number
}

export interface DashboardStats {
  totalOrders: number
  orderPlacedOrders: number
  processingOrders: number
  deliveredOrders: number
  cancelledOrders: number
  pendingPaymentVerification: number
  verifiedPayments: number
  totalSales: string
  todayRevenue: string
  todayOrders: number
  yesterdayRevenue: string
  yesterdayOrders: number
  weekRevenue: string
  weekOrders: number
  averageOrderValue: string
  newCustomersThisWeek: number
  paymentMethodBreakdown: {
    paystack: { count: number; revenue: string }
    bankTransfer: { count: number; revenue: string }
  }
  recentOrders: DashboardRecentOrder[]
  topProducts: DashboardTopProduct[]
}



export interface AdminOrderListItem {
  orderNumber: string
  customerName: string
  email: string | null
  phone: string
  fulfillmentMethod: FulfillmentMethod
  shoppingMode: ShoppingMode
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

export type AdminPaymentStatus = PaymentSubmissionStatus | 'SUCCESSFUL'

export type AdminPaymentListStatus = AdminPaymentStatus | 'CONFIRMED'

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
  status: AdminPaymentStatus
  createdAt: string
  /** Bank-transfer submission fields (absent/empty for gateway payments). */
  senderName?: string | null
  transactionReference?: string | null
  transferredAt?: string | null
  proofUrl?: string
  proofAvailable?: boolean
  rejectionReason?: PaymentRejectionReason | null
  reviewNote?: string | null
  reviewedAt?: string | null
  auditHistory?: AdminPaymentAuditItem[]
  /** Gateway payment fields (present for e.g. Paystack). */
  providerReference?: string
  channel?: string | null
  paidAt?: string | null
  currency?: string
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
  status?: AdminPaymentListStatus
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

export interface AdminPaymentMethodBreakdown {
  paystack: AdminPaymentSummaryItem
  bankTransfer: AdminPaymentSummaryItem
}

export interface AdminPaymentSummary {
  pending: AdminPaymentSummaryItem
  verified: AdminPaymentSummaryItem
  rejected: AdminPaymentSummaryItem
  methodBreakdown: AdminPaymentMethodBreakdown
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
