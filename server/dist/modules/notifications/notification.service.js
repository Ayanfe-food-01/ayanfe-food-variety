import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http.js';
const notificationRetentionMs = 90 * 24 * 60 * 60 * 1000;
export async function createAdminNotification(database, input) {
    try {
        await database.adminNotification.create({
            data: input,
        });
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return;
        }
        throw error;
    }
}
const toResponse = (notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    href: notification.href,
    isRead: notification.reads.length > 0,
    createdAt: notification.createdAt.toISOString(),
});
const pruneOldNotifications = async () => {
    await prisma.adminNotification.deleteMany({
        where: {
            createdAt: {
                lt: new Date(Date.now() - notificationRetentionMs),
            },
        },
    });
};
export async function listAdminNotifications(adminId, query) {
    await pruneOldNotifications();
    const [notifications, total, unreadCount] = await Promise.all([
        prisma.adminNotification.findMany({
            orderBy: { createdAt: 'desc' },
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
            include: {
                reads: {
                    where: { adminId },
                    select: { id: true },
                },
            },
        }),
        prisma.adminNotification.count(),
        prisma.adminNotification.count({
            where: {
                reads: {
                    none: { adminId },
                },
            },
        }),
    ]);
    return {
        notifications: notifications.map(toResponse),
        unreadCount,
        pagination: {
            page: query.page,
            pageSize: query.pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        },
    };
}
export async function markAdminNotificationRead(notificationId, adminId) {
    const notification = await prisma.adminNotification.findUnique({
        where: { id: notificationId },
        select: { id: true },
    });
    if (!notification)
        throw new HttpError(404, 'Notification not found.');
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
    });
}
export async function markAllAdminNotificationsRead(adminId) {
    const unreadNotifications = await prisma.adminNotification.findMany({
        where: {
            reads: {
                none: { adminId },
            },
        },
        select: { id: true },
    });
    if (unreadNotifications.length === 0)
        return;
    await prisma.adminNotificationRead.createMany({
        data: unreadNotifications.map(({ id }) => ({
            notificationId: id,
            adminId,
        })),
        skipDuplicates: true,
    });
}
