import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http.js';
const toCategory = (category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    isActive: category.isActive,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
});
export async function getCategories(includeInactive = false) {
    const categories = await prisma.category.findMany({
        where: includeInactive ? undefined : { isActive: true },
        orderBy: { name: 'asc' },
    });
    return categories.map(toCategory);
}
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'category';
export async function createCategory(input) {
    const slug = slugify(input.name);
    const duplicate = await prisma.category.findFirst({
        where: {
            OR: [
                { name: { equals: input.name, mode: 'insensitive' } },
                { slug },
            ],
        },
        select: { name: true, slug: true },
    });
    if (duplicate?.name.toLowerCase() === input.name.toLowerCase()) {
        throw new HttpError(409, 'A category with this name already exists.');
    }
    if (duplicate?.slug === slug)
        throw new HttpError(409, 'A category with this slug already exists.');
    try {
        const category = await prisma.category.create({
            data: { name: input.name, slug, description: input.description, isActive: input.isActive },
        });
        return toCategory(category);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new HttpError(409, 'A category with this name or slug already exists.');
        }
        throw error;
    }
}
export async function updateCategoryStatus(id, isActive) {
    try {
        const category = await prisma.category.update({ where: { id }, data: { isActive } });
        return toCategory(category);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new HttpError(404, 'Category not found.');
        }
        throw error;
    }
}
