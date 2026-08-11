import { Prisma, OrderStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http.js';
const toOrderResponse = (order) => ({
    id: order.id,
    customerName: order.customerName,
    phone: order.phone,
    whatsapp: order.whatsapp,
    email: order.email,
    deliveryAddress: order.deliveryAddress,
    city: order.city,
    note: order.note,
    subtotal: order.subtotal.toString(),
    total: order.total.toString(),
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    orderItems: order.orderItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice.toString(),
        quantity: item.quantity,
        subtotal: item.subtotal.toString(),
        product: item.product,
    })),
});
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
};
export async function createOrder(input) {
    return prisma.$transaction(async (transaction) => {
        const productIds = input.items.map((item) => item.productId);
        const products = await transaction.product.findMany({
            where: {
                id: { in: productIds },
                isActive: true,
            },
        });
        const productsById = new Map(products.map((product) => [product.id, product]));
        const unavailableProductIds = productIds.filter((productId) => !productsById.has(productId));
        if (unavailableProductIds.length > 0) {
            throw new HttpError(400, 'One or more products are unavailable');
        }
        const orderItems = input.items.map((item) => {
            const product = productsById.get(item.productId);
            if (!product) {
                throw new Error('Product lookup failed');
            }
            const subtotal = product.price.mul(item.quantity);
            return {
                productId: product.id,
                productName: product.name,
                unitPrice: product.price,
                quantity: item.quantity,
                subtotal,
            };
        });
        const subtotal = orderItems.reduce((total, item) => total.add(item.subtotal), new Prisma.Decimal(0));
        const order = await transaction.order.create({
            data: {
                userId: input.userId,
                customerName: input.customerName,
                phone: input.phone,
                whatsapp: input.whatsapp,
                email: input.email,
                deliveryAddress: input.deliveryAddress,
                city: input.city,
                note: input.note,
                subtotal,
                total: subtotal,
                paymentStatus: PaymentStatus.PENDING,
                orderStatus: OrderStatus.PENDING,
                orderItems: {
                    create: orderItems,
                },
            },
            include: orderInclude,
        });
        if (input.userId) {
            await transaction.user.update({
                where: { id: input.userId },
                data: { phone: input.phone },
            });
        }
        return toOrderResponse(order);
    });
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
export async function getOrderById(id) {
    const order = await prisma.order.findUnique({
        where: { id },
        include: orderInclude,
    });
    return order ? toOrderResponse(order) : null;
}
