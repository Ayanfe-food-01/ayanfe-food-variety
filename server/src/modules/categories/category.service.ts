import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { AdminCategoryQuery, Category, CategoryInput } from './category.types.js'

const toCategory = (category: {
  id: string
  name: string
  slug: string
  description: string
  image: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count?: { products: number }
}): Category => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
  description: category.description,
  image: category.image,
  isActive: category.isActive,
  createdAt: category.createdAt.toISOString(),
  updatedAt: category.updatedAt.toISOString(),
  ...(category._count ? { productCount: category._count.products } : {}),
})

export async function getCategories(includeInactive = false): Promise<Category[]> {
  const categories = await prisma.category.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { name: 'asc' },
  })

  return categories.map(toCategory)
}

const slugify = (value: string): string =>
  (value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120).replace(/-+$/, '') || 'category')

const generatedSlug = (name: string): string => slugify(name)

const duplicateCategoryError = (field: 'name' | 'slug') =>
  new HttpError(409, field === 'name'
    ? 'A category with this name already exists.'
    : 'A category with this slug already exists.')

export async function createCategory(input: CategoryInput): Promise<Category> {
  const duplicateName = await prisma.category.findFirst({
    where: { name: { equals: input.name, mode: 'insensitive' } },
    select: { id: true },
  })
  if (duplicateName) throw duplicateCategoryError('name')
  const slug = generatedSlug(input.name)
  const duplicateSlug = await prisma.category.findFirst({
    where: { slug },
    select: { id: true },
  })
  if (duplicateSlug) throw duplicateCategoryError('slug')

  try {
    const category = await prisma.category.create({
      data: { name: input.name, slug, description: input.description, isActive: input.isActive },
    })
    return toCategory(category)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'A category with this name or slug already exists.')
    }
    throw error
  }
}

export async function listAdminCategories(query: AdminCategoryQuery) {
  const where: Prisma.CategoryWhereInput = {
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
  }

  const [total, categories] = await prisma.$transaction([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])

  return {
    categories: categories.map(toCategory),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  }
}

export async function getAdminCategory(id: string): Promise<Category> {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  })
  if (!category) throw new HttpError(404, 'Category not found.')
  return toCategory(category)
}

export async function updateCategory(id: string, input: CategoryInput): Promise<Category> {
  await getAdminCategory(id)
  const duplicateName = await prisma.category.findFirst({
    where: { name: { equals: input.name, mode: 'insensitive' }, NOT: { id } },
    select: { id: true },
  })
  if (duplicateName) throw duplicateCategoryError('name')
  const slug = generatedSlug(input.name)
  const duplicateSlug = await prisma.category.findFirst({
    where: { slug, NOT: { id } },
    select: { id: true },
  })
  if (duplicateSlug) throw duplicateCategoryError('slug')

  try {
    const category = await prisma.category.update({
      where: { id },
      data: { name: input.name, slug, description: input.description, isActive: input.isActive },
      include: { _count: { select: { products: true } } },
    })
    return toCategory(category)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw duplicateCategoryError('slug')
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Category not found.')
    }
    throw error
  }
}

export async function updateCategoryStatus(id: string, isActive: boolean): Promise<Category> {
  try {
    const category = await prisma.category.update({
      where: { id },
      data: { isActive },
      include: { _count: { select: { products: true } } },
    })
    return toCategory(category)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Category not found.')
    }
    throw error
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  })
  if (!category) throw new HttpError(404, 'Category not found.')
  if (category._count.products > 0) {
    throw new HttpError(409, 'This category is currently in use. Deactivate it instead of deleting it.')
  }

  try {
    await prisma.category.delete({ where: { id } })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2025')) {
      throw new HttpError(409, 'This category is currently in use. Deactivate it instead of deleting it.')
    }
    throw error
  }
}