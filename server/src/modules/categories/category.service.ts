import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { buildSearchWhere, type SearchFieldConfig } from '../../utils/search.js'
import { cacheKey, CACHE_TTL, getOrSet, invalidateCategoryCaches } from '../cache/index.js'
import type { AdminCategoryQuery, Category, CategoryInput } from './category.types.js'
import type { StoredCategoryImage } from './category.storage.js'

const ADMIN_CATEGORY_SEARCH_FIELDS: SearchFieldConfig[] = [
  { path: 'name', primary: true, weight: 2 },
  { path: 'slug', weight: 0.8 },
  { path: 'description', weight: 0.4 },
]

const toCategory = (category: {
  id: string
  name: string
  slug: string
  description: string
  imageUrl: string
  imagePublicId: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count?: { products: number }
}, includeStorage = false): Category => ({
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
})

/**
 * PUBLIC category list with cache-aside.
 * Single key (all active categories) cached for 1 hour. The admin variants
 * below (`listAdminCategories`, `getAdminCategory`) deliberately bypass the
 * cache so the dashboard always reflects live data.
 */
export async function getCategories(includeInactive = false): Promise<Category[]> {
  if (includeInactive) return queryCategories(true)

  return getOrSet({
    key: cacheKey.categories(),
    ttlSeconds: CACHE_TTL.categories,
    fetch: () => queryCategories(false),
  })
}

/** Uncached database implementation of the category list. */
async function queryCategories(includeInactive: boolean): Promise<Category[]> {
  const categories = await prisma.category.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { name: 'asc' },
  })

  return categories.map((category) => toCategory(category))
}

const slugify = (value: string): string =>
  (value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120).replace(/-+$/, '') || 'category')

const generatedSlug = (name: string): string => slugify(name)

const duplicateCategoryError = (field: 'name' | 'slug') =>
  new HttpError(409, field === 'name'
    ? 'A category with this name already exists.'
    : 'A category with this slug already exists.')

export async function createCategory(input: CategoryInput, image?: StoredCategoryImage): Promise<Category> {
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
      data: {
        name: input.name,
        slug,
        description: input.description,
        imageUrl: image?.url ?? '',
        imagePublicId: image?.publicId,
        isActive: input.isActive,
      },
    })
    // Creating a category can change category rails / product sections, so
    // clear the category list too.
    void invalidateCategoryCaches()
    return toCategory(category, true)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'A category with this name or slug already exists.')
    }
    throw error
  }
}

export async function listAdminCategories(query: AdminCategoryQuery) {
  const where: Prisma.CategoryWhereInput = {
    ...(buildSearchWhere<Prisma.CategoryWhereInput>(query.search, ADMIN_CATEGORY_SEARCH_FIELDS) ?? {}),
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
    categories: categories.map((category) => toCategory(category, true)),
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
  return toCategory(category, true)
}

export async function updateCategory(id: string, input: CategoryInput, image?: StoredCategoryImage): Promise<Category> {
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
      data: {
        name: input.name,
        slug,
        description: input.description,
        ...(image ? { imageUrl: image.url, imagePublicId: image.publicId } : {}),
        isActive: input.isActive,
      },
      include: { _count: { select: { products: true } } },
    })
    // Renames / description / active-state edits affect the category list and
    // every listing grouped by category.
    void invalidateCategoryCaches()
    return toCategory(category, true)
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
    // Deactivating a category hides its products from public listings.
    void invalidateCategoryCaches()
    return toCategory(category, true)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Category not found.')
    }
    throw error
  }
}

export async function deleteCategory(id: string): Promise<string | null> {
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
    void invalidateCategoryCaches()
    return category.imagePublicId
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2025')) {
      throw new HttpError(409, 'This category is currently in use. Deactivate it instead of deleting it.')
    }
    throw error
  }
}