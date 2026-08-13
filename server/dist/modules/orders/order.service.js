import { Prisma, OrderStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http.js';
import { notifyOrderCreated, notifyOrderStatusChanged } from './order.email.js';
import { deductStock, restoreStock } from '../inventory/inventory.service.js';
const toPaymentSubmissionResponse = (submission) => ({
    id: submission.id,
    senderName: submission.senderName,
    transactionReference: submission.transactionReference,
    amount: submission.amount.toString(),
    transferredAt: submission.transferredAt.toISOString(),
    proofUrl: submission.proofUrl,
    status: submission.status,
    reviewNote: submission.reviewNote,
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    createdAt: submission.createdAt.toISOString(),
});
const toOrderResponse = (order) => {
    const latestPayment = order.paymentSubmissions[0];
    const paymentStatus = order.paymentStatus === PaymentStatus.PAID
        ? 'PAID'
        : latestPayment?.status === 'PENDING'
            ? 'PENDING'
            : order.paymentStatus === PaymentStatus.FAILED || latestPayment?.status === 'REJECTED'
                ? 'REJECTED'
                : 'PENDING';
    return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        phone: order.phone,
        whatsapp: order.whatsapp,
        email: order.email,
        deliveryAddress: order.deliveryAddress,
        city: order.city,
        note: order.note,
        subtotal: order.subtotal.toString(),
        deliveryFee: order.deliveryFee.toString(),
        total: order.total.toString(),
        paymentMethod: order.paymentMethod,
        paymentStatus,
        orderStatus: order.orderStatus,
        cancellationReason: order.cancellationReason,
        cancelledAt: order.cancelledAt?.toISOString() ?? null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        orderItems: order.orderItems.map((item) => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            unitPrice: item.unitPrice.toString(),
            quantity: item.quantity,
            subtotal: item.subtotal.toString(),
            deliveryFee: item.deliveryFee.toString(),
            product: item.product,
        })),
        paymentSubmissions: order.paymentSubmissions.map(toPaymentSubmissionResponse),
        payment: order.paymentSnapshot,
        statusHistory: order.statusHistory.map((history) => ({
            previousStatus: history.previousStatus,
            newStatus: history.newStatus,
            createdAt: history.createdAt.toISOString(),
        })),
    };
};
const orderInclude = {
    orderItems: {
        include: {
            product: {
                select: {
                    id: true,
                    slug: true,
                    image: true,
                },
            },
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
    paymentSnapshot: {
        select: {
            paymentMethod: true,
            bankName: true,
            accountName: true,
            accountNumber: true,
            instructions: true,
        },
    },
    statusHistory: {
        orderBy: { createdAt: 'asc' },
        select: {
            previousStatus: true,
            newStatus: true,
            createdAt: true,
        },
    },
};
const nextOrderNumber = async (transaction) => {
    const result = await transaction.$queryRaw(Prisma.sql `SELECT nextval('orders_order_number_seq')`);
    const sequence = Number(result[0]?.nextval);
    return `AFV-${new Date().getUTCFullYear()}-${String(sequence).padStart(6, '0')}`;
};
export async function checkoutCustomerCart(userId, input) {
    let result;
    try {
        result = await prisma.$transaction(async (transaction) => {
            const existingOrder = await transaction.order.findUnique({
                where: { checkoutKey: input.checkoutKey },
                include: orderInclude,
            });
            if (existingOrder) {
                if (existingOrder.userId !== userId) {
                    throw new HttpError(409, 'This checkout request cannot be reused.');
                }
                return { order: existingOrder, created: false };
            }
            const user = await transaction.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, role: true, emailVerified: true },
            });
            if (!user || user.role !== 'CUSTOMER' || !user.emailVerified) {
                throw new HttpError(403, 'A verified customer account is required.');
            }
            const cartReference = await transaction.customerCart.findUnique({
                where: { userId: user.id },
                select: { id: true },
            });
            if (!cartReference)
                throw new HttpError(400, 'Your cart is empty.');
            // Serialize checkout against cart changes and then read the cart again.
            await transaction.$queryRaw(Prisma.sql `SELECT id FROM customer_carts WHERE id = ${cartReference.id}::uuid FOR UPDATE`);
            const cart = await transaction.customerCart.findUnique({
                where: { id: cartReference.id },
                include: {
                    items: {
                        select: { id: true, productId: true, quantity: true, createdAt: true },
                        orderBy: { createdAt: 'asc' },
                    },
                },
            });
            if (!cart || cart.items.length === 0)
                throw new HttpError(400, 'Your cart is empty.');
            const paymentSettings = await transaction.paymentSettings.findUnique({
                where: {
                    singletonKey_paymentMethod: {
                        singletonKey: 'default',
                        paymentMethod: input.paymentMethod,
                    },
                },
            });
            if (!paymentSettings || !paymentSettings.isActive) {
                throw new HttpError(400, 'The selected payment method is unavailable.');
            }
            const invalidQuantity = cart.items.find((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000);
            if (invalidQuantity)
                throw new HttpError(400, 'One or more cart quantities are invalid.');
            // Cart prices and product metadata are never used as order authorities.
            const products = await transaction.product.findMany({
                where: { id: { in: cart.items.map((item) => item.productId) } },
                select: {
                    id: true,
                    name: true,
                    price: true,
                    deliveryFee: true,
                    isActive: true,
                    stockQuantity: true,
                    category: { select: { isActive: true } },
                },
            });
            const productsById = new Map(products.map((product) => [product.id, product]));
            const unavailableMessages = cart.items.flatMap((item) => {
                const product = productsById.get(item.productId);
                if (!product)
                    return [`Product ${item.productId} no longer exists.`];
                if (!product.isActive || !product.category.isActive)
                    return [`${product.name} is no longer available.`];
                if (product.stockQuantity < item.quantity) {
                    return [`${product.name}: only ${product.stockQuantity} unit(s) currently available.`];
                }
                return [];
            });
            if (unavailableMessages.length > 0) {
                throw new HttpError(409, unavailableMessages.join(' '));
            }
            const orderItems = cart.items.map((item) => {
                const product = productsById.get(item.productId);
                if (!product)
                    throw new HttpError(409, 'One or more products are no longer available.');
                const subtotal = product.price.mul(item.quantity);
                const deliveryFee = product.deliveryFee.mul(item.quantity);
                return {
                    productId: product.id,
                    productName: product.name,
                    unitPrice: product.price,
                    quantity: item.quantity,
                    subtotal,
                    deliveryFee,
                };
            });
            const subtotal = orderItems.reduce((total, item) => total.add(item.subtotal), new Prisma.Decimal(0));
            const totalDeliveryFee = orderItems.reduce((total, item) => total.add(item.deliveryFee), new Prisma.Decimal(0));
            const order = await transaction.order.create({
                data: {
                    checkoutKey: input.checkoutKey,
                    orderNumber: await nextOrderNumber(transaction),
                    userId: user.id,
                    customerName: input.customerName,
                    phone: input.phone,
                    email: user.email,
                    deliveryAddress: input.deliveryAddress,
                    city: input.city,
                    note: input.deliveryInstructions,
                    subtotal,
                    deliveryFee: totalDeliveryFee,
                    total: subtotal.add(totalDeliveryFee),
                    paymentMethod: input.paymentMethod,
                    paymentStatus: PaymentStatus.PENDING,
                    orderStatus: OrderStatus.ORDER_PLACED,
                    orderItems: { create: orderItems },
                    statusHistory: {
                        create: {
                            previousStatus: null,
                            newStatus: OrderStatus.ORDER_PLACED,
                            changedBy: user.id,
                        },
                    },
                    paymentSnapshot: {
                        create: {
                            paymentMethod: paymentSettings.paymentMethod,
                            bankName: paymentSettings.bankName,
                            accountName: paymentSettings.accountName,
                            accountNumber: paymentSettings.accountNumber,
                            instructions: paymentSettings.instructions,
                        },
                    },
                },
                include: orderInclude,
            });
            for (const item of [...cart.items].sort((left, right) => left.productId.localeCompare(right.productId))) {
                const product = productsById.get(item.productId);
                try {
                    await deductStock(transaction, {
                        productId: item.productId,
                        quantity: item.quantity,
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                    });
                }
                catch (error) {
                    if (error instanceof HttpError && (error.statusCode === 404 || error.statusCode === 409)) {
                        throw new HttpError(error.statusCode, product ? `${product.name}: ${error.message}` : error.message);
                    }
                    throw error;
                }
            }
            await transaction.order.update({
                where: { id: order.id },
                data: { stockDeductedAt: new Date() },
            });
            await transaction.customerCartItem.deleteMany({
                where: { id: { in: cart.items.map((item) => item.id) }, cartId: cart.id },
            });
            return { order, created: true };
        });
    }
    catch (error) {
        const isCheckoutKeyConflict = error instanceof Prisma.PrismaClientKnownRequestError
            && error.code === 'P2002'
            && String(error.meta?.target ?? '').includes('checkout_key');
        if (!isCheckoutKeyConflict)
            throw error;
        const existingOrder = await prisma.order.findUnique({
            where: { checkoutKey: input.checkoutKey },
            include: orderInclude,
        });
        if (!existingOrder || existingOrder.userId !== userId) {
            throw new HttpError(409, 'This checkout request cannot be reused.');
        }
        return toOrderResponse(existingOrder);
    }
    if (result.created) {
        void notifyOrderCreated({
            orderNumber: result.order.orderNumber,
            customerName: result.order.customerName,
            customerEmail: result.order.email,
            phone: result.order.phone,
            deliveryAddress: result.order.deliveryAddress,
            city: result.order.city,
            note: result.order.note,
            subtotal: result.order.subtotal.toString(),
            deliveryFee: result.order.deliveryFee.toString(),
            total: result.order.total.toString(),
            paymentMethod: result.order.paymentMethod,
            paymentStatus: result.order.paymentStatus,
            orderStatus: result.order.orderStatus,
            createdAt: result.order.createdAt.toISOString(),
            items: result.order.orderItems.map((item) => ({
                name: item.productName,
                unitPrice: item.unitPrice.toString(),
                quantity: item.quantity,
                subtotal: item.subtotal.toString(),
            })),
        }).catch((error) => console.error('Order confirmation email failed', error));
    }
    return toOrderResponse(result.order);
}
export async function listCustomerOrders(userId) {
    const orders = await prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: orderInclude,
    });
    return orders.map(toOrderResponse);
}
export async function getCustomerOrder(userId, id) {
    const order = await prisma.order.findFirst({
        where: { id, userId },
        include: orderInclude,
    });
    return order ? toOrderResponse(order) : null;
}
export async function getCustomerOrderByNumber(userId, orderNumber) {
    const order = await prisma.order.findFirst({
        where: { orderNumber, userId },
        include: orderInclude,
    });
    return order ? toOrderResponse(order) : null;
}
const customerCancellableStatuses = new Set([
    OrderStatus.ORDER_PLACED,
    OrderStatus.PROCESSING,
]);
export async function cancelCustomerOrder(userId, orderNumber, reason) {
    const result = await prisma.$transaction(async (transaction) => {
        const existing = await transaction.order.findFirst({
            where: { orderNumber, userId },
            include: {
                orderItems: { select: { productId: true, quantity: true } },
            },
        });
        if (!existing)
            throw new HttpError(404, 'Order not found.');
        if (!customerCancellableStatuses.has(existing.orderStatus)) {
            throw new HttpError(409, 'This order can no longer be cancelled.');
        }
        const cancelledAt = new Date();
        const updated = await transaction.order.updateMany({
            where: {
                id: existing.id,
                userId,
                orderStatus: { in: [...customerCancellableStatuses] },
            },
            data: {
                orderStatus: OrderStatus.CANCELLED,
                cancellationReason: reason ?? null,
                cancelledAt,
                ...(existing.stockDeductedAt && !existing.stockRestoredAt
                    ? { stockRestoredAt: cancelledAt }
                    : {}),
            },
        });
        if (updated.count !== 1) {
            throw new HttpError(409, 'The order changed while it was being cancelled. Please try again.');
        }
        const order = await transaction.order.findUniqueOrThrow({
            where: { id: existing.id },
            include: orderInclude,
        });
        await transaction.orderStatusHistory.create({
            data: {
                orderId: order.id,
                previousStatus: existing.orderStatus,
                newStatus: OrderStatus.CANCELLED,
                changedBy: userId,
                note: reason ?? 'Cancelled by customer.',
            },
        });
        if (existing.stockDeductedAt && !existing.stockRestoredAt) {
            for (const item of existing.orderItems) {
                await restoreStock(transaction, {
                    productId: item.productId,
                    quantity: item.quantity,
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                });
            }
        }
        return order;
    });
    void notifyOrderStatusChanged({
        orderNumber: result.orderNumber,
        customerName: result.customerName,
        customerEmail: result.email,
        orderStatus: result.orderStatus,
    }).catch((error) => console.error('Order cancellation email failed', error));
    return toOrderResponse(result);
}
export async function getOrderById(id) {
    const order = await prisma.order.findUnique({
        where: { id },
        include: orderInclude,
    });
    return order ? toOrderResponse(order) : null;
}
