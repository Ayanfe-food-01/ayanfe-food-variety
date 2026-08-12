import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http.js';
import { recordStockAdjustment } from '../inventory/inventory.service.js';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const toProduct = (product) => ({
    id: product.id,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price.toString(),
    deliveryFee: product.deliveryFee.toString(),
    unit: product.unit,
    image: product.image,
    isActive: product.isActive,
    stockQuantity: product.stockQuantity,
    availabilityStatus: product.stockQuantity === 0
        ? 'OUT_OF_STOCK'
        : product.stockQuantity <= 5
            ? 'LOW_STOCK'
            : 'IN_STOCK',
    isAvailable: product.isActive && product.stockQuantity > 0,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
});
const toPublicProduct = (product) => {
    const response = toProduct(product);
    const { stockQuantity: _stockQuantity, ...publicProduct } = response;
    return publicProduct;
};
export async function getProducts(query) {
    const where = {
        isActive: true,
        category: { isActive: true },
        ...(query.search
            ? {
                OR: [
                    { name: { contains: query.search, mode: 'insensitive' } },
                    { description: { contains: query.search, mode: 'insensitive' } },
                ],
            }
            : {}),
    };
    if (query.category) {
        where.category = {
            isActive: true,
            ...(UUID_PATTERN.test(query.category) ? { id: query.category } : { slug: query.category }),
        };
    }
    const orderBy = query.sort === 'price_asc'
        ? [{ price: 'asc' }, { createdAt: 'desc' }]
        : query.sort === 'price_desc'
            ? [{ price: 'desc' }, { createdAt: 'desc' }]
            : [{ createdAt: 'desc' }, { id: 'desc' }];
    const [total, products] = await prisma.$transaction([
        prisma.product.count({ where }),
        prisma.product.findMany({
            where,
            include: { category: true },
            orderBy,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
    ]);
    return {
        products: products.map(toPublicProduct),
        pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.limit)),
        },
    };
}
export async function getNewArrivals(query) {
    return getProducts({ ...query, sort: 'newest' });
}
export async function getProductById(identifier) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
    const product = await prisma.product.findFirst({
        where: isUuid
            ? { isActive: true, category: { isActive: true }, OR: [{ id: identifier }, { slug: identifier }] }
            : { isActive: true, category: { isActive: true }, slug: identifier },
        include: { category: true },
    });
    if (!product)
        return null;
    return toPublicProduct(product);
}
const productInclude = { category: true };
const slugify = (value) => {
    const slug = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || `product-${Date.now()}`;
};
const uniqueSlug = async (name, excludedId) => {
    const base = slugify(name);
    let slug = base;
    let suffix = 2;
    while (await prisma.product.findFirst({ where: { slug, ...(excludedId ? { NOT: { id: excludedId } } : {}) }, select: { id: true } })) {
        slug = `${base}-${suffix}`;
        suffix += 1;
    }
    return slug;
};
export const validateProductCategory = async (categoryId) => {
    const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true, isActive: true } });
    if (!category)
        throw new HttpError(400, 'The selected category does not exist.');
    if (!category.isActive)
        throw new HttpError(400, 'The selected category is inactive.');
};
const toAdminProduct = (product) => toProduct(product);
export async function listAdminProducts(query) {
    const where = {};
    if (query.search) {
        where.OR = [
            { name: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
        ];
    }
    if (query.categoryId)
        where.categoryId = query.categoryId;
    if (query.availability === 'active')
        where.isActive = true;
    if (query.availability === 'inactive')
        where.isActive = false;
    if (query.availability === 'out-of-stock') {
        where.isActive = true;
        where.stockQuantity = 0;
    }
    const [total, products] = await prisma.$transaction([
        prisma.product.count({ where }),
        prisma.product.findMany({
            where,
            include: productInclude,
            orderBy: { createdAt: 'desc' },
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
        }),
    ]);
    return {
        products: products.map(toAdminProduct),
        pagination: {
            page: query.page,
            pageSize: query.pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        },
    };
}
export async function getAdminProduct(id) {
    const product = await prisma.product.findUnique({ where: { id }, include: productInclude });
    if (!product)
        throw new HttpError(404, 'Product not found.');
    return toAdminProduct(product);
}
export async function createProduct(input, adminId) {
    await validateProductCategory(input.categoryId);
    try {
        const product = await prisma.$transaction(async (transaction) => {
            const created = await transaction.product.create({
                data: {
                    categoryId: input.categoryId,
                    name: input.name,
                    slug: await uniqueSlug(input.name),
                    description: input.description,
                    price: input.price,
                    deliveryFee: input.deliveryFee,
                    unit: input.unit,
                    image: input.image ?? '',
                    isActive: input.isActive,
                    stockQuantity: input.stockQuantity,
                },
                include: productInclude,
            });
            if (created.stockQuantity > 0) {
                await recordStockAdjustment(transaction, {
                    productId: created.id,
                    quantityDelta: created.stockQuantity,
                    previousQuantity: 0,
                    newQuantity: created.stockQuantity,
                    reason: `Initial stock by admin ${adminId}`,
                });
            }
            return created;
        });
        return toAdminProduct(product);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new HttpError(409, 'A product with this information already exists.');
        }
        throw error;
    }
}
export async function updateProduct(input, adminId, id) {
    await validateProductCategory(input.categoryId);
    try {
        const product = await prisma.$transaction(async (transaction) => {
            const currentRows = await transaction.$queryRaw(Prisma.sql `SELECT id, stock_quantity
          FROM products
          WHERE id = ${id}::uuid
          FOR UPDATE`);
            const current = currentRows[0];
            if (!current)
                throw new HttpError(404, 'Product not found.');
            const updated = await transaction.product.update({
                where: { id },
                data: {
                    categoryId: input.categoryId,
                    name: input.name,
                    slug: await uniqueSlug(input.name, id),
                    description: input.description,
                    price: input.price,
                    deliveryFee: input.deliveryFee,
                    unit: input.unit,
                    ...(input.image ? { image: input.image } : {}),
                    isActive: input.isActive,
                    stockQuantity: input.stockQuantity,
                },
                include: productInclude,
            });
            if (updated.stockQuantity !== current.stock_quantity) {
                await recordStockAdjustment(transaction, {
                    productId: id,
                    quantityDelta: updated.stockQuantity - current.stock_quantity,
                    previousQuantity: current.stock_quantity,
                    newQuantity: updated.stockQuantity,
                    reason: `Admin ${adminId} set stock to ${updated.stockQuantity}`,
                });
            }
            return updated;
        });
        return toAdminProduct(product);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new HttpError(409, 'A product with this information already exists.');
        }
        throw error;
    }
}
export async function updateProductStatus(id, isActive) {
    const product = await prisma.product.update({
        where: { id },
        data: { isActive },
        include: productInclude,
    }).catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new HttpError(404, 'Product not found.');
        }
        throw error;
    });
    return toAdminProduct(product);
}
