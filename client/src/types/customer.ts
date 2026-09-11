import type { OrderStatus, PaymentStatus } from '../services/orderService'

export type CustomerSort = 'recent' | 'spend' | 'orders' | 'newest'

export type CustomerStatusFilter = 'active' | 'inactive'

export interface AdminCustomersQuery {
  page: number
  pageSize: number
  search?: string
  status?: CustomerStatusFilter
  minOrders?: number
  maxOrders?: number
  lastOrder?: number | 'older'
  sort: CustomerSort
}

export interface AdminCustomerListItem {
  id: string
  name: string
  email: string
  phone: string | null
  shoppingMode: 'RETAIL' | 'WHOLESALE'
  createdAt: string
  lastOrderAt: string | null
  totalOrders: number
  totalSpent: string
  averageOrderValue: string
  isActive: boolean
}

export interface AdminCustomerSummary {
  totalCustomers: number
  newThisMonth: number
  previousMonthCustomers: number
  repeatCustomerPct: number | null
  averageLifetimeSpend: string
}

export interface AdminCustomersPage {
  customers: AdminCustomerListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  summary: AdminCustomerSummary
}

export interface AdminCustomerOrder {
  orderNumber: string
  itemCount: number
  total: string
  orderStatus: OrderStatus
  paymentStatus: PaymentStatus
  createdAt: string
}

export interface AdminCustomerAddress {
  deliveryAddress: string
  city: string
  state: string | null
}

export interface AdminCustomerDetail {
  id: string
  name: string
  email: string
  phone: string | null
  shoppingMode: 'RETAIL' | 'WHOLESALE'
  createdAt: string
  lastLoginAt: string | null
  lastOrderAt: string | null
  totalOrders: number
  totalSpent: string
  averageOrderValue: string
  repeatCustomer: boolean
  isActive: boolean
  orders: AdminCustomerOrder[]
  addresses: AdminCustomerAddress[]
}