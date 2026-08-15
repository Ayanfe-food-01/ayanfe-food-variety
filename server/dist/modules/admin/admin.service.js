import { OrderStatus, PaymentSubmissionStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http.js';
import { notifyOrderStatusChanged } from '../orders/order.email.js';
import { restoreStock } from '../inventory/inventory.service.js';
const toOrderListItem = (order) => ({
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    total: order.total.toString(),
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    archivedAt: order.archivedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
});
const toPaymentListItem = (payment) => ({
    id: payment.id,
    orderId: payment.orderId,
    orderNumber: payment.order.orderNumber,
    customerName: payment.order.customerName,
    customerEmail: payment.order.email,
    customerPhone: payment.order.phone,
    senderName: payment.senderName,
    transactionReference: payment.transactionReference,
    amount: payment.amount.toString(),
    expectedAmount: payment.order.total.toString(),
    paymentMethod: payment.order.paymentMethod,
    orderPaymentStatus: payment.order.paymentStatus,
    orderStatus: payment.order.orderStatus,
    transferredAt: payment.transferredAt.toISOString(),
    proofUrl: payment.proofUrl,
    proofAvailable: Boolean(payment.proofUrl.trim()),
    status: payment.status,
    rejectionReason: payment.rejectionReason,
    reviewNote: payment.reviewNote,
    reviewedAt: payment.reviewedAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    ...(payment.auditEvents
        ? {
            auditHistory: payment.auditEvents.map((event) => ({
                id: event.id,
                action: event.action,
                note: event.note,
                createdAt: event.createdAt.toISOString(),
                performedBy: event.performedBy,
            })),
        }
        : {}),
});
export async function getDashboardStats() {
    const [totalOrders, orderPlacedOrders, processingOrders, deliveredOrders, cancelledOrders, pendingPaymentVerification, verifiedPayments, sales] = await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { orderStatus: OrderStatus.ORDER_PLACED } }),
        prisma.order.count({ where: { orderStatus: OrderStatus.PROCESSING } }),
        prisma.order.count({ where: { orderStatus: OrderStatus.DELIVERED } }),
        prisma.order.count({ where: { orderStatus: OrderStatus.CANCELLED } }),
        prisma.paymentSubmission.count({ where: { status: PaymentSubmissionStatus.PENDING } }),
        prisma.paymentSubmission.count({ where: { status: PaymentSubmissionStatus.VERIFIED } }),
        prisma.order.aggregate({
            _sum: { total: true },
            where: { paymentStatus: PaymentStatus.PAID },
        }),
    ]);
    return {
        totalOrders,
        orderPlacedOrders,
        processingOrders,
        deliveredOrders,
        cancelledOrders,
        pendingPaymentVerification,
        verifiedPayments,
        totalSales: sales._sum.total?.toString() ?? '0',
    };
}
export async function listAdminOrders(query) {
    const search = query.search
        ? {
            OR: [
                { orderNumber: { contains: query.search, mode: 'insensitive' } },
                { customerName: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
                { phone: { contains: query.search, mode: 'insensitive' } },
            ],
        }
        : undefined;
    const where = {
        ...(search ?? {}),
        ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
        ...(query.orderStatus ? { orderStatus: query.orderStatus } : {}),
        ...(query.archive === 'active' ? { archivedAt: null } : {}),
        ...(query.archive === 'archived' ? { NOT: { archivedAt: null } } : {}),
    };
    const [total, orders] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.findMany({
            where,
            orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
            select: {
                orderNumber: true,
                customerName: true,
                email: true,
                phone: true,
                total: true,
                paymentStatus: true,
                orderStatus: true,
                archivedAt: true,
                createdAt: true,
            },
        }),
    ]);
    return {
        orders: orders.map(toOrderListItem),
        pagination: {
            page: query.page,
            pageSize: query.pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        },
    };
}
const orderDetailInclude = {
    orderItems: {
        select: {
            id: true,
            productId: true,
            productName: true,
            unitPrice: true,
            quantity: true,
            subtotal: true,
            deliveryFee: true,
        },
    },
    paymentSubmissions: {
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            senderName: true,
            transactionReference: true,
            amount: true,
            transferredAt: true,
            proofUrl: true,
            status: true,
            reviewNote: true,
            reviewedAt: true,
            createdAt: true,
        },
    },
    statusHistory: {
        orderBy: { createdAt: 'desc' },
        include: { changedByUser: { select: { name: true, email: true } } },
    },
    paymentSnapshot: {
        select: {
            paymentMethod: true,
            bankName: true,
            accountName: true,
            accountNumber: true,
            instructions: true,
        },
    },
};
export async function getAdminOrder(orderNumber) {
    const order = await prisma.order.findUnique({ where: { orderNumber }, include: orderDetailInclude });
    if (!order)
        throw new HttpError(404, 'Order not found.');
    return {
        ...order,
        subtotal: order.subtotal.toString(),
        total: order.total.toString(),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        cancelledAt: order.cancelledAt?.toISOString() ?? null,
        archivedAt: order.archivedAt?.toISOString() ?? null,
        orderItems: order.orderItems.map((item) => ({
            ...item,
            unitPrice: item.unitPrice.toString(),
            subtotal: item.subtotal.toString(),
        })),
        paymentSubmissions: order.paymentSubmissions.map((payment) => ({
            ...payment,
            amount: payment.amount.toString(),
            transferredAt: payment.transferredAt.toISOString(),
            reviewedAt: payment.reviewedAt?.toISOString() ?? null,
            createdAt: payment.createdAt.toISOString(),
        })),
        statusHistory: order.statusHistory.map((history) => ({
            id: history.id,
            previousStatus: history.previousStatus,
            newStatus: history.newStatus,
            changedBy: history.changedByUser,
            note: history.note,
            createdAt: history.createdAt.toISOString(),
        })),
    };
}
const allowedTransitions = {
    [OrderStatus.ORDER_PLACED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
    [OrderStatus.PROCESSING]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
    [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
};
const fulfillmentStatusesRequiringPayment = new Set([
    OrderStatus.PROCESSING,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
]);
export async function updateAdminOrderStatus(orderNumber, input, adminId) {
    const updated = await prisma.$transaction(async (transaction) => {
        const existing = await transaction.order.findUnique({
            where: { orderNumber },
            include: {
                orderItems: { select: { productId: true, quantity: true } },
            },
        });
        if (!existing)
            throw new HttpError(404, 'Order not found.');
        if (existing.orderStatus === input.orderStatus) {
            if (input.orderStatus === OrderStatus.CANCELLED &&
                existing.stockDeductedAt &&
                !existing.stockRestoredAt) {
                const restoreClaim = await transaction.order.updateMany({
                    where: { id: existing.id, orderStatus: OrderStatus.CANCELLED, stockRestoredAt: null },
                    data: { stockRestoredAt: new Date() },
                });
                if (restoreClaim.count !== 1)
                    return existing;
                for (const item of existing.orderItems) {
                    await restoreStock(transaction, {
                        productId: item.productId,
                        quantity: item.quantity,
                        orderId: existing.id,
                        orderNumber: existing.orderNumber,
                    });
                }
                return transaction.order.findUniqueOrThrow({ where: { id: existing.id } });
            }
            return existing;
        }
        if (!allowedTransitions[existing.orderStatus].includes(input.orderStatus)) {
            throw new HttpError(409, `Order status cannot change from ${existing.orderStatus} to ${input.orderStatus}.`);
        }
        if (fulfillmentStatusesRequiringPayment.has(input.orderStatus) && existing.paymentStatus !== PaymentStatus.PAID) {
            throw new HttpError(409, 'Payment must be confirmed before the order can move through fulfilment.');
        }
        const orderUpdate = await transaction.order.updateMany({
            where: { id: existing.id, orderStatus: existing.orderStatus },
            data: {
                orderStatus: input.orderStatus,
                ...(input.orderStatus === OrderStatus.CANCELLED
                    ? {
                        cancellationReason: input.note ?? existing.cancellationReason,
                        cancelledAt: existing.cancelledAt ?? new Date(),
                    }
                    : {}),
                ...(input.orderStatus === OrderStatus.CANCELLED && existing.stockDeductedAt && !existing.stockRestoredAt
                    ? { stockRestoredAt: new Date() }
                    : {}),
            },
        });
        if (orderUpdate.count !== 1) {
            throw new HttpError(409, 'The order changed while it was being updated. Please try again.');
        }
        const order = await transaction.order.findUniqueOrThrow({ where: { id: existing.id } });
        await transaction.orderStatusHistory.create({
            data: {
                orderId: order.id,
                previousStatus: existing.orderStatus,
                newStatus: input.orderStatus,
                changedBy: adminId,
                note: input.note ?? null,
            },
        });
        if (input.orderStatus === OrderStatus.CANCELLED && existing.stockDeductedAt && !existing.stockRestoredAt) {
            for (const item of existing.orderItems) {
                await restoreStock(transaction, {
                    productId: item.productId,
                    quantity: item.quantity,
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                });
            }
        }
        return {
            ...order,
            customerName: existing.customerName,
            email: existing.email,
        };
    });
    void notifyOrderStatusChanged({
        orderNumber: updated.orderNumber,
        customerName: updated.customerName,
        customerEmail: updated.email,
        orderStatus: updated.orderStatus,
    }).catch((error) => console.error('Order status email failed', error));
    return getAdminOrder(orderNumber);
}
export async function archiveAdminOrder(orderNumber, adminId) {
    const result = await prisma.order.updateMany({
        where: { orderNumber, archivedAt: null },
        data: { archivedAt: new Date(), archivedById: adminId },
    });
    if (result.count === 0) {
        const existing = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true } });
        if (!existing)
            throw new HttpError(404, 'Order not found.');
    }
    return getAdminOrder(orderNumber);
}
export async function restoreAdminOrder(orderNumber) {
    const result = await prisma.order.updateMany({
        where: { orderNumber, archivedAt: { not: null } },
        data: { archivedAt: null, archivedById: null },
    });
    if (result.count === 0) {
        const existing = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true, archivedAt: true } });
        if (!existing)
            throw new HttpError(404, 'Order not found.');
    }
    return getAdminOrder(orderNumber);
}
export async function deleteAdminOrder(orderNumber) {
    await prisma.$transaction(async (transaction) => {
        const existing = await transaction.order.findUnique({
            where: { orderNumber },
            select: {
                id: true,
                archivedAt: true,
                paymentStatus: true,
                orderStatus: true,
                stockDeductedAt: true,
                stockRestoredAt: true,
                paymentSubmissions: { select: { id: true }, take: 1 },
            },
        });
        if (!existing)
            throw new HttpError(404, 'Order not found.');
        if (!existing.archivedAt)
            throw new HttpError(409, 'Only archived orders can be permanently deleted.');
        if (existing.paymentStatus !== PaymentStatus.PENDING || existing.paymentSubmissions.length > 0) {
            throw new HttpError(409, 'Orders with payment records cannot be permanently deleted.');
        }
        if (existing.orderStatus !== OrderStatus.CANCELLED || (existing.stockDeductedAt && !existing.stockRestoredAt)) {
            throw new HttpError(409, 'Only cancelled orders with reconciled stock can be permanently deleted.');
        }
        await transaction.order.delete({ where: { id: existing.id } });
    });
}
export async function listAdminPayments(query) {
    const search = query.search
        ? {
            OR: [
                { transactionReference: { contains: query.search, mode: 'insensitive' } },
                { senderName: { contains: query.search, mode: 'insensitive' } },
                { order: { orderNumber: { contains: query.search, mode: 'insensitive' } } },
                { order: { customerName: { contains: query.search, mode: 'insensitive' } } },
                { order: { email: { contains: query.search, mode: 'insensitive' } } },
            ],
        }
        : undefined;
    const where = {
        ...(search ?? {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.paymentMethod ? { order: { paymentMethod: query.paymentMethod } } : {}),
        ...(query.from || query.to
            ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
            : {}),
    };
    const orderSelect = {
        orderNumber: true,
        customerName: true,
        email: true,
        phone: true,
        total: true,
        paymentMethod: true,
        paymentStatus: true,
        orderStatus: true,
    };
    const [total, payments, grouped] = await Promise.all([
        prisma.paymentSubmission.count({ where }),
        prisma.paymentSubmission.findMany({
            where,
            orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
            include: { order: { select: orderSelect } },
        }),
        prisma.paymentSubmission.groupBy({
            by: ['status'],
            _count: { _all: true },
            _sum: { amount: true },
        }),
    ]);
    const summary = {
        pending: { count: 0, totalAmount: '0' },
        verified: { count: 0, totalAmount: '0' },
        rejected: { count: 0, totalAmount: '0' },
    };
    grouped.forEach((item) => {
        const key = item.status === PaymentSubmissionStatus.PENDING
            ? 'pending'
            : item.status === PaymentSubmissionStatus.VERIFIED
                ? 'verified'
                : 'rejected';
        summary[key] = { count: item._count._all, totalAmount: item._sum.amount?.toString() ?? '0' };
    });
    return {
        payments: payments.map(toPaymentListItem),
        pagination: {
            page: query.page,
            pageSize: query.pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        },
        summary,
    };
}
export async function getAdminPayment(id) {
    const payment = await prisma.paymentSubmission.findUnique({
        where: { id },
        include: {
            order: {
                select: {
                    orderNumber: true,
                    customerName: true,
                    email: true,
                    phone: true,
                    total: true,
                    paymentMethod: true,
                    paymentStatus: true,
                    orderStatus: true,
                },
            },
            auditEvents: {
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    action: true,
                    note: true,
                    createdAt: true,
                    performedBy: { select: { name: true, email: true } },
                },
            },
        },
    });
    if (!payment)
        throw new HttpError(404, 'Payment submission not found.');
    return toPaymentListItem(payment);
}
