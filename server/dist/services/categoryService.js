import { prisma } from '../db/prisma.js';
export async function listCategories() {
    const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
    });
    return categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        image: category.image,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
    }));
}
