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
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface AdminNotificationsQuery {
  page: number
  pageSize: number
}