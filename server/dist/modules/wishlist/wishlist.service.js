import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http.js';
import { toPublicProduct } from '../products/product.service.js';
const wishlistProductInclude = { category: true };
const requireProduct = async (productId) => {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: wishlistProductInclude,
    });
    if (!product)
        throw new HttpError(404, 'This product is no longer available.');
    return product;
};
export async function getWishlist(userId) {
    const items = await prisma.wishlistItem.findMany({
        where: { userId },
        include: { product: { include: { category: true } } },
        orderBy: { createdAt: 'desc' },
    });
    const products = items.map((item) => toPublicProduct(item.product));
    return { products, productIds: products.map((product) => product.id) };
}
export async function getWishlistStatus(userId, productId) {
    const item = await prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId, productId } },
        select: { id: true },
    });
    return { isWishlisted: Boolean(item) };
}
export async function addToWishlist(userId, productId) {
    await requireProduct(productId);
    try {
        await prisma.wishlistItem.upsert({
            where: { userId_productId: { userId, productId } },
            create: { userId, productId },
            update: {},
        });
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            throw new HttpError(404, 'This product is no longer available.');
        }
        throw error;
    }
    return getWishlistStatus(userId, productId);
}
export async function removeFromWishlist(userId, productId) {
    await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
    return { isWishlisted: false };
}
