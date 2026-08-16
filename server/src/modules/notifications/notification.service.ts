import { AdminNotificationType, Prisma } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type {
  AdminNotificationResponse,
  AdminNotificationsResponse,
} from './notification.types.js'

type NotificationDatabase = Prisma.TransactionClient | PrismaClient

const notificationRetentionMs = 90 * 24 * 60 * 60 * 1000

export interface CreateAdminNotificationInput {
  type: AdminNotificationType
  eventKey: string
  title: string
  message: string
  href: string
}

export async function createAdminNotification(
  database: NotificationDatabase,
  input: CreateAdminNotificationInput,
): Promise<void> {
  try {
    await database.adminNotification.create({
      data: input,
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return
    }
    throw error
  }
}

const toResponse = (notification: {
  id: string
  type: AdminNotificationType
  title: string
  message: string
  href: string
  createdAt: Date
  reads: Array<{ id: string }>
}): AdminNotificationResponse => ({
  id: notification.id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  href: notification.href,
  isRead: notification.reads.length > 0,
  createdAt: notification.createdAt.toISOString(),
})

const pruneOldNotifications = async (): Promise<void> => {
  await prisma.adminNotification.deleteMany({
    where: {
      createdAt: {
        lt: new Date(Date.now() - notificationRetentionMs),
      },
    },
  })
}

export async function listAdminNotifications(adminId: string): Promise<AdminNotificationsResponse> {
  await pruneOldNotifications()

  const [notifications, unreadCount] = await Promise.all([
    prisma.adminNotification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        reads: {
          where: { adminId },
          select: { id: true },
        },
      },
    }),
    prisma.adminNotification.count({
      where: {
        reads: {
          none: { adminId },
        },
      },
    }),
  ])

  return {
    notifications: notifications.map(toResponse),
    unreadCount,
  }
}

export async function markAdminNotificationRead(notificationId: string, adminId: string): Promise<void> {
  const notification = await prisma.adminNotification.findUnique({
    where: { id: notificationId },
    select: { id: true },
  })
  if (!notification) throw new HttpError(404, 'Notification not found.')

  await prisma.adminNotificationRead.upsert({
    where: {
      notificationId_adminId: {
        notificationId,
        adminId,
      },
    },
    create: {
      notificationId,
      adminId,
    },
    update: {
      readAt: new Date(),
    },
  })
}

export async function markAllAdminNotificationsRead(adminId: string): Promise<void> {
  const unreadNotifications = await prisma.adminNotification.findMany({
    where: {
      reads: {
        none: { adminId },
      },
    },
    select: { id: true },
  })

  if (unreadNotifications.length === 0) return

  await prisma.adminNotificationRead.createMany({
    data: unreadNotifications.map(({ id }) => ({
      notificationId: id,
      adminId,
    })),
    skipDuplicates: true,
  })
}