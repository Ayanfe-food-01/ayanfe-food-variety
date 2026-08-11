import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http.js';
const cartInclude = {
    items: {
        include: {
            product: {
                select: { id: true, name: true, unit: true, price: true, image: true, isActive: true },
            },
        },
        orderBy: { createdAt: 'asc' },
    },
};
function toCartItems(cart) {
    return cart.items
        .filter((item) => item.product.isActive)
        .map((item) => ({
        id: item.id,
        productId: item.product.id,
        name: item.product.name,
        unit: item.product.unit,
        price: item.product.price.toString(),
        image: item.product.image,
        quantity: item.quantity,
    }));
}
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
    return toCartItems(await getCartForUser(userId));
}
export async function addCustomerCartItem(userId, item) {
    return prisma.$transaction(async (transaction) => {
        const product = await transaction.product.findFirst({
            where: { id: item.productId, isActive: true },
            select: { id: true },
        });
        if (!product)
            throw new HttpError(400, 'This product is no longer available.');
        const cart = await transaction.customerCart.upsert({
            where: { userId },
            create: { userId },
            update: {},
        });
        const existing = await transaction.customerCartItem.findUnique({
            where: { cartId_productId: { cartId: cart.id, productId: item.productId } },
        });
        if (existing) {
            await transaction.customerCartItem.update({
                where: { id: existing.id },
                data: { quantity: Math.min(1000, existing.quantity + item.quantity) },
            });
        }
        else {
            await transaction.customerCartItem.create({
                data: { cartId: cart.id, productId: item.productId, quantity: item.quantity },
            });
        }
        return transaction.customerCart.findUniqueOrThrow({ where: { id: cart.id }, include: cartInclude });
    }).then(toCartItems);
}
export async function updateCustomerCartItem(userId, cartItemId, quantity) {
    return prisma.$transaction(async (transaction) => {
        const item = await transaction.customerCartItem.findFirst({
            where: { id: cartItemId, cart: { userId } },
            include: { product: { select: { isActive: true } } },
        });
        if (!item)
            throw new HttpError(404, 'Cart item not found.');
        if (!item.product.isActive)
            throw new HttpError(400, 'This product is no longer available.');
        await transaction.customerCartItem.update({
            where: { id: item.id },
            data: { quantity },
        });
        return transaction.customerCart.findUniqueOrThrow({
            where: { id: item.cartId },
            include: cartInclude,
        });
    }).then(toCartItems);
}
export async function removeCustomerCartItem(userId, cartItemId) {
    const result = await prisma.customerCartItem.deleteMany({
        where: { id: cartItemId, cart: { userId } },
    });
    if (result.count !== 1)
        throw new HttpError(404, 'Cart item not found.');
}
export async function clearCustomerCart(userId) {
    const cart = await prisma.customerCart.findUnique({ where: { userId }, select: { id: true } });
    if (!cart)
        return;
    await prisma.customerCartItem.deleteMany({ where: { cartId: cart.id } });
}
export async function mergeCustomerCart(userId, items) {
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: { id: true },
    });
    const validIds = new Set(products.map((product) => product.id));
    return prisma.$transaction(async (transaction) => {
        const cart = await transaction.customerCart.upsert({
            where: { userId },
            create: { userId },
            update: {},
        });
        for (const item of items) {
            if (!validIds.has(item.productId))
                continue;
            const existing = await transaction.customerCartItem.findUnique({
                where: { cartId_productId: { cartId: cart.id, productId: item.productId } },
            });
            if (existing) {
                await transaction.customerCartItem.update({
                    where: { id: existing.id },
                    data: { quantity: Math.min(1000, existing.quantity + item.quantity) },
                });
            }
            else {
                await transaction.customerCartItem.create({
                    data: { cartId: cart.id, productId: item.productId, quantity: item.quantity },
                });
            }
        }
        return transaction.customerCart.findUniqueOrThrow({ where: { id: cart.id }, include: cartInclude });
    }).then(toCartItems);
}
export async function replaceCustomerCart(userId, items) {
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: { id: true },
    });
    const validIds = new Set(products.map((product) => product.id));
    return prisma.$transaction(async (transaction) => {
        const cart = await transaction.customerCart.upsert({
            where: { userId },
            create: { userId },
            update: {},
        });
        await transaction.customerCartItem.deleteMany({ where: { cartId: cart.id } });
        const validItems = items.filter((item) => validIds.has(item.productId));
        if (validItems.length > 0) {
            await transaction.customerCartItem.createMany({
                data: validItems.map((item) => ({ cartId: cart.id, productId: item.productId, quantity: item.quantity })),
            });
        }
        return transaction.customerCart.findUniqueOrThrow({ where: { id: cart.id }, include: cartInclude });
    }).then(toCartItems);
}
