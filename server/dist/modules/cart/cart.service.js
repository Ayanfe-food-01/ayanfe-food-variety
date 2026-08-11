import { prisma } from '../../lib/prisma.js';
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
        productId: item.product.id,
        name: item.product.name,
        unit: item.product.unit,
        price: item.product.price.toString(),
        image: item.product.image,
        quantity: item.quantity,
    }));
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
    return toCartItems(await getOrCreateCart(userId));
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
