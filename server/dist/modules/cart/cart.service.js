import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http.js';
const cartInclude = {
    items: {
        include: {
            product: {
                select: {
                    id: true,
                    name: true,
                    unit: true,
                    price: true,
                    image: true,
                    isActive: true,
                    stockQuantity: true,
                    category: { select: { isActive: true } },
                },
            },
        },
        orderBy: { createdAt: 'asc' },
    },
};
function toCartResponse(cart) {
    let subtotal = new Prisma.Decimal(0);
    let totalQuantity = 0;
    const items = cart.items.map((item) => {
        const itemSubtotal = item.product.price.mul(item.quantity);
        const isProductActive = item.product.isActive && item.product.category.isActive;
        const isAvailable = isProductActive && item.product.stockQuantity >= item.quantity && item.product.stockQuantity > 0;
        const availabilityMessage = !isProductActive
            ? 'This product is no longer available.'
            : item.product.stockQuantity === 0
                ? 'This product is out of stock.'
                : item.product.stockQuantity < item.quantity
                    ? `Only ${item.product.stockQuantity} unit(s) are currently available.`
                    : null;
        subtotal = subtotal.add(itemSubtotal);
        totalQuantity += item.quantity;
        return {
            id: item.id,
            productId: item.product.id,
            name: item.product.name,
            unit: item.product.unit,
            price: item.product.price.toString(),
            image: item.product.image,
            quantity: item.quantity,
            itemSubtotal: itemSubtotal.toString(),
            isAvailable,
            availabilityMessage,
        };
    });
    return {
        items,
        subtotal: subtotal.toString(),
        totalQuantity,
        canCheckout: items.length > 0 && items.every((item) => item.isAvailable),
    };
}
const assertProductCanFulfill = (product, quantity) => {
    if (!product)
        throw new HttpError(404, 'Product no longer exists or is unavailable.');
    if (!product.isActive || product.category?.isActive === false || product.stockQuantity === 0) {
        throw new HttpError(409, 'Product is unavailable.');
    }
    if (quantity > product.stockQuantity) {
        throw new HttpError(409, `Insufficient stock. Only ${product.stockQuantity} unit(s) are currently available.`);
    }
};
async function getCartForUser(userId) {
    return getOrCreateCart(userId);
}
async function getOrCreateCart(userId) {
    return prisma.customerCart.upsert({
        where: { userId },
        create: { userId },
        update: {},
        include: cartInclude,
    });
}
export async function getCustomerCart(userId) {
    return toCartResponse(await getCartForUser(userId));
}
export async function addCustomerCartItem(userId, item) {
    return prisma.$transaction(async (transaction) => {
        const product = await transaction.product.findUnique({
            where: { id: item.productId },
            select: { id: true, isActive: true, stockQuantity: true, category: { select: { isActive: true } } },
        });
        assertProductCanFulfill(product, item.quantity);
        const cart = await transaction.customerCart.upsert({
            where: { userId },
            create: { userId },
            update: {},
        });
        const existing = await transaction.customerCartItem.findUnique({
            where: { cartId_productId: { cartId: cart.id, productId: item.productId } },
        });
        if (existing) {
            const nextQuantity = existing.quantity + item.quantity;
            if (nextQuantity > 1000)
                throw new HttpError(400, 'Cart quantity cannot exceed 1000.');
            assertProductCanFulfill(product, nextQuantity);
            await transaction.customerCartItem.update({
                where: { id: existing.id },
                data: { quantity: nextQuantity },
            });
        }
        else {
            await transaction.customerCartItem.create({
                data: { cartId: cart.id, productId: item.productId, quantity: item.quantity },
            });
        }
        return transaction.customerCart.findUniqueOrThrow({ where: { id: cart.id }, include: cartInclude });
    }).then(toCartResponse);
}
export async function updateCustomerCartItem(userId, cartItemId, quantity) {
    return prisma.$transaction(async (transaction) => {
        const item = await transaction.customerCartItem.findFirst({
            where: { id: cartItemId, cart: { userId } },
            include: { product: { select: { isActive: true, stockQuantity: true, category: { select: { isActive: true } } } } },
        });
        if (!item)
            throw new HttpError(404, 'Cart item not found.');
        assertProductCanFulfill({ id: item.productId, ...item.product }, quantity);
        await transaction.customerCartItem.update({
            where: { id: item.id },
            data: { quantity },
        });
        return transaction.customerCart.findUniqueOrThrow({
            where: { id: item.cartId },
            include: cartInclude,
        });
    }).then(toCartResponse);
}
export async function removeCustomerCartItem(userId, cartItemId) {
    return prisma.$transaction(async (transaction) => {
        const result = await transaction.customerCartItem.deleteMany({
            where: { id: cartItemId, cart: { userId } },
        });
        if (result.count !== 1)
            throw new HttpError(404, 'Cart item not found.');
        return transaction.customerCart.findUniqueOrThrow({
            where: { userId },
            include: cartInclude,
        });
    }).then(toCartResponse);
}
export async function clearCustomerCart(userId) {
    const cart = await prisma.customerCart.upsert({
        where: { userId },
        create: { userId },
        update: {},
        include: cartInclude,
    });
    if (cart.items.length === 0)
        return toCartResponse(cart);
    await prisma.customerCartItem.deleteMany({ where: { cartId: cart.id } });
    return toCartResponse(await getCartForUser(userId));
}
export async function mergeCustomerCart(userId, items) {
    return prisma.$transaction(async (transaction) => {
        const cart = await transaction.customerCart.upsert({
            where: { userId },
            create: { userId },
            update: {},
        });
        for (const item of items) {
            const product = await transaction.product.findUnique({
                where: { id: item.productId },
                select: { id: true, isActive: true, stockQuantity: true, category: { select: { isActive: true } } },
            });
            const existing = await transaction.customerCartItem.findUnique({
                where: { cartId_productId: { cartId: cart.id, productId: item.productId } },
            });
            const nextQuantity = (existing?.quantity ?? 0) + item.quantity;
            assertProductCanFulfill(product, nextQuantity);
            if (nextQuantity > 1000)
                throw new HttpError(400, 'Cart quantity cannot exceed 1000.');
            if (existing) {
                await transaction.customerCartItem.update({
                    where: { id: existing.id },
                    data: { quantity: nextQuantity },
                });
            }
            else {
                await transaction.customerCartItem.create({
                    data: { cartId: cart.id, productId: item.productId, quantity: item.quantity },
                });
            }
        }
        return transaction.customerCart.findUniqueOrThrow({ where: { id: cart.id }, include: cartInclude });
    }).then(toCartResponse);
}
export async function replaceCustomerCart(userId, items) {
    return prisma.$transaction(async (transaction) => {
        const cart = await transaction.customerCart.upsert({
            where: { userId },
            create: { userId },
            update: {},
        });
        for (const item of items) {
            const product = await transaction.product.findUnique({
                where: { id: item.productId },
                select: { id: true, isActive: true, stockQuantity: true, category: { select: { isActive: true } } },
            });
            assertProductCanFulfill(product, item.quantity);
        }
        await transaction.customerCartItem.deleteMany({ where: { cartId: cart.id } });
        if (items.length > 0) {
            await transaction.customerCartItem.createMany({
                data: items.map((item) => ({ cartId: cart.id, productId: item.productId, quantity: item.quantity })),
            });
        }
        return transaction.customerCart.findUniqueOrThrow({ where: { id: cart.id }, include: cartInclude });
    }).then(toCartResponse);
}
