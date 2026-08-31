import { request } from './api'

export type AdminNotificationType =
  | 'NEW_ORDER'
  | 'PAYMENT_PROOF_SUBMITTED'
  | 'PAYMENT_CONFIRMED'
  | 'CUSTOMER_ORDER_CANCELLED'
  | 'LOW_STOCK'
  | 'NEW_QUOTE_REQUEST'
  | 'QUOTE_ACCEPTED'
  | 'QUOTE_REJECTED'

export interface AdminNotification {
  id: string
  type: AdminNotificationType
  title: string
  message: string
  href: string
  isRead: boolean
  createdAt: string
}

export interface AdminNotificationsQuery {
  page?: number
  pageSize?: number
}

interface AdminNotificationsResponse {
  success: true
  data: {
    notifications: AdminNotification[]
    unreadCount: number
    pagination: {
      page: number
      pageSize: number
      total: number
      totalPages: number
    }
  }
}

export type AdminNotificationsPage = AdminNotificationsResponse['data']

export async function getAdminNotifications(query: AdminNotificationsQuery = {}): Promise<AdminNotificationsPage> {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))
  const queryString = params.toString()
  const response = await request<AdminNotificationsResponse>(`/admin/notifications${queryString ? `?${queryString}` : ''}`)
  return response.data
}

export async function markAdminNotificationRead(id: string): Promise<void> {
  await request<{ success: true }>(`/admin/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function markAllAdminNotificationsRead(): Promise<void> {
  await request<{ success: true }>('/admin/notifications/read-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
}