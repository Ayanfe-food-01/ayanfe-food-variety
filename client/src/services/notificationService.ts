import { request } from './api'

export type AdminNotificationType =
  | 'NEW_ORDER'
  | 'PAYMENT_PROOF_SUBMITTED'
  | 'PAYMENT_CONFIRMED'
  | 'CUSTOMER_ORDER_CANCELLED'
  | 'LOW_STOCK'

export interface AdminNotification {
  id: string
  type: AdminNotificationType
  title: string
  message: string
  href: string
  isRead: boolean
  createdAt: string
}

interface AdminNotificationsResponse {
  success: true
  data: {
    notifications: AdminNotification[]
    unreadCount: number
  }
}

export async function getAdminNotifications(): Promise<AdminNotificationsResponse['data']> {
  const response = await request<AdminNotificationsResponse>('/admin/notifications')
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