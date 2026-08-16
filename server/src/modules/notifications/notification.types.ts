import type { AdminNotificationType } from '@prisma/client'

export interface AdminNotificationResponse {
  id: string
  type: AdminNotificationType
  title: string
  message: string
  href: string
  isRead: boolean
  createdAt: string
}

export interface AdminNotificationsResponse {
  notifications: AdminNotificationResponse[]
  unreadCount: number
}