import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { productInclude, toProduct } from './product.mapper.js'
import type { ProductWithRatings } from './product.mapper.js'
import { getProductWholesaleFromMap } from './product.wholesale.service.js'
import type { PublicCategoryProductSection, PublicProduct, PublicProductPage, PublicProductQuery } from './product.types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const toPublicProduct = (product: ProductWithRatings, isWishlisted = false, wholesaleFrom?: string | null): PublicProduct => {
  return toProduct(product, isWishlisted, wholesaleFrom)
}

export const getWishlistProductIds = async (productIds: string[], userId?: string): Promise<Set<string>> => {
  if (!userId || productIds.length === 0) return new Set<string>()
  const items = await prisma.wishlistItem.findMany({
    where: { userId, productId: { in: productIds } },
    select: { productId: true },
  })
  return new Set(items.map((item) => item.productId))
}

export async function getProducts(query: PublicProductQuery, wishlistUserId?: string, includeWholesale = false): Promise<PublicProductPage> {
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    category: { isActive: true },
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { category: { name: { contains: query.search, mode: 'insensitive' } } },
            { category: { slug: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  if (query.category) {
    where.category = {
      isActive: true,
      ...(UUID_PATTERN.test(query.category) ? { id: query.category } : { slug: query.category }),
    }
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] = query.sort === 'price_asc'
    ? [{ price: 'asc' }, { createdAt: 'desc' }]
    : query.sort === 'price_desc'
      ? [{ price: 'desc' }, { createdAt: 'desc' }]
      : [{ createdAt: 'desc' }, { id: 'desc' }]

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ])

  const wishlistProductIds = await getWishlistProductIds(
    products.map((product) => product.id),
    wishlistUserId,
  )
  const wholesaleFromMap = includeWholesale
    ? await getProductWholesaleFromMap(products.map((product) => product.id))
    : null

  return {
    products: products.map((product) => toPublicProduct(
      product,
      wishlistProductIds.has(product.id),
      wholesaleFromMap?.get(product.id),
    )),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  }
}

export async function getCategoryProductSections(
  limit: number,
  wishlistUserId?: string,
  includeWholesale = false,
): Promise<PublicCategoryProductSection[]> {
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      products: { some: { isActive: true, stockQuantity: { gt: 0 } } },
    },
    include: {
      products: {
        where: { isActive: true, stockQuantity: { gt: 0 } },
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' } },
          options: { orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
      },
    },
    orderBy: { name: 'asc' },
  })

  const products = categories.flatMap((category) => category.products)
  const wishlistProductIds = await getWishlistProductIds(
    products.map((product) => product.id),
    wishlistUserId,
  )
  const wholesaleFromMap = includeWholesale
    ? await getProductWholesaleFromMap(products.map((product) => product.id))
    : null

  return categories
    .filter((category) => category.products.length > 0)
    .map((category) => ({
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
      products: category.products.map((product) => toPublicProduct(
        product,
        wishlistProductIds.has(product.id),
        wholesaleFromMap?.get(product.id),
      )),
    }))
}

export async function getNewArrivals(query: PublicProductQuery, wishlistUserId?: string, includeWholesale = false): Promise<PublicProductPage> {
  return getProducts({ ...query, sort: 'newest' }, wishlistUserId, includeWholesale)
}

export async function getFeaturedProducts(query: PublicProductQuery, wishlistUserId?: string, includeWholesale = false): Promise<PublicProductPage> {
  const where: Prisma.ProductWhereInput = {
    isFeatured: true,
    isActive: true,
    stockQuantity: { gt: 0 },
    category: { isActive: true },
  }
  const products = await prisma.product.findMany({
    where,
    include: productInclude,
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })
  const wishlistProductIds = await getWishlistProductIds(
    products.map((product) => product.id),
    wishlistUserId,
  )
  const wholesaleFromMap = includeWholesale
    ? await getProductWholesaleFromMap(products.map((product) => product.id))
    : null

  return {
    products: products.map((product) => toPublicProduct(
      product,
      wishlistProductIds.has(product.id),
      wholesaleFromMap?.get(product.id),
    )),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: products.length,
      totalPages: 1,
    },
  }
}

export async function getProductById(identifier: string, wishlistUserId?: string, includeWholesale = false): Promise<PublicProduct | null> {
  const isUuid = UUID_PATTERN.test(identifier)
  const product = await prisma.product.findFirst({
    where: isUuid
      ? { isActive: true, category: { isActive: true }, OR: [{ id: identifier }, { slug: identifier }] }
      : { isActive: true, category: { isActive: true }, slug: identifier },
    include: productInclude,
  })

  if (!product) return null
  const isWishlisted = (await getWishlistProductIds([product.id], wishlistUserId)).has(product.id)
  const wholesaleFromMap = includeWholesale ? await getProductWholesaleFromMap([product.id]) : null
  return toPublicProduct(product, isWishlisted, wholesaleFromMap?.get(product.id))
}