import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http.js';
const toCategory = (category, includeStorage = false) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
    ...(includeStorage ? { imagePublicId: category.imagePublicId } : {}),
    isActive: category.isActive,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    ...(category._count ? { productCount: category._count.products } : {}),
});
export async function getCategories(includeInactive = false) {
    const categories = await prisma.category.findMany({
        where: includeInactive ? undefined : { isActive: true },
        orderBy: { name: 'asc' },
    });
    return categories.map((category) => toCategory(category));
}
const slugify = (value) => (value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120).replace(/-+$/, '') || 'category');
const generatedSlug = (name) => slugify(name);
const duplicateCategoryError = (field) => new HttpError(409, field === 'name'
    ? 'A category with this name already exists.'
    : 'A category with this slug already exists.');
export async function createCategory(input, image) {
    const duplicateName = await prisma.category.findFirst({
        where: { name: { equals: input.name, mode: 'insensitive' } },
        select: { id: true },
    });
    if (duplicateName)
        throw duplicateCategoryError('name');
    const slug = generatedSlug(input.name);
    const duplicateSlug = await prisma.category.findFirst({
        where: { slug },
        select: { id: true },
    });
    if (duplicateSlug)
        throw duplicateCategoryError('slug');
    try {
        const category = await prisma.category.create({
            data: {
                name: input.name,
                slug,
                description: input.description,
                imageUrl: image?.url ?? '',
                imagePublicId: image?.publicId,
                isActive: input.isActive,
            },
        });
        return toCategory(category, true);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new HttpError(409, 'A category with this name or slug already exists.');
        }
        throw error;
    }
}
export async function listAdminCategories(query) {
    const where = {
        ...(query.search
            ? {
                OR: [
                    { name: { contains: query.search, mode: 'insensitive' } },
                    { description: { contains: query.search, mode: 'insensitive' } },
                    { slug: { contains: query.search, mode: 'insensitive' } },
                ],
            }
            : {}),
        ...(query.status ? { isActive: query.status === 'active' } : {}),
    };
    const [total, categories] = await prisma.$transaction([
        prisma.category.count({ where }),
        prisma.category.findMany({
            where,
            include: { _count: { select: { products: true } } },
            orderBy: { name: 'asc' },
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
        }),
    ]);
    return {
        categories: categories.map((category) => toCategory(category, true)),
        pagination: {
            page: query.page,
            pageSize: query.pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        },
    };
}
export async function getAdminCategory(id) {
    const category = await prisma.category.findUnique({
        where: { id },
        include: { _count: { select: { products: true } } },
    });
    if (!category)
        throw new HttpError(404, 'Category not found.');
    return toCategory(category, true);
}
export async function updateCategory(id, input, image) {
    await getAdminCategory(id);
    const duplicateName = await prisma.category.findFirst({
        where: { name: { equals: input.name, mode: 'insensitive' }, NOT: { id } },
        select: { id: true },
    });
    if (duplicateName)
        throw duplicateCategoryError('name');
    const slug = generatedSlug(input.name);
    const duplicateSlug = await prisma.category.findFirst({
        where: { slug, NOT: { id } },
        select: { id: true },
    });
    if (duplicateSlug)
        throw duplicateCategoryError('slug');
    try {
        const category = await prisma.category.update({
            where: { id },
            data: {
                name: input.name,
                slug,
                description: input.description,
                ...(image ? { imageUrl: image.url, imagePublicId: image.publicId } : {}),
                isActive: input.isActive,
            },
            include: { _count: { select: { products: true } } },
        });
        return toCategory(category, true);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw duplicateCategoryError('slug');
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new HttpError(404, 'Category not found.');
        }
        throw error;
    }
}
export async function updateCategoryStatus(id, isActive) {
    try {
        const category = await prisma.category.update({
            where: { id },
            data: { isActive },
            include: { _count: { select: { products: true } } },
        });
        return toCategory(category, true);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new HttpError(404, 'Category not found.');
        }
        throw error;
    }
}
export async function deleteCategory(id) {
    const category = await prisma.category.findUnique({
        where: { id },
        include: { _count: { select: { products: true } } },
    });
    if (!category)
        throw new HttpError(404, 'Category not found.');
    if (category._count.products > 0) {
        throw new HttpError(409, 'This category is currently in use. Deactivate it instead of deleting it.');
    }
    try {
        await prisma.category.delete({ where: { id } });
        return category.imagePublicId;
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2025')) {
            throw new HttpError(409, 'This category is currently in use. Deactivate it instead of deleting it.');
        }
        throw error;
    }
}
