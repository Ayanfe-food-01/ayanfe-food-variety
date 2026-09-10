import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { productInclude, toProduct } from './product.mapper.js'
import type { ProductWithRatings } from './product.mapper.js'
import { getProductWholesaleFromMap } from './product.wholesale.service.js'
import { buildSearchWhere, rankSearchResults, type SearchFieldConfig, type SearchRankConfig } from '../../utils/search.js'
import type { PublicCategoryProductSection, PublicProduct, PublicProductPage, PublicProductQuery } from './product.types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const toPublicProduct = (product: ProductWithRatings, isWishlisted = false, wholesaleFrom?: string | null): PublicProduct => {
  return toProduct(product, isWishlisted, wholesaleFrom)
}

const PUBLIC_PRODUCT_SEARCH_FIELDS: SearchFieldConfig[] = [
  { path: 'name', primary: true, weight: 2 },
  { path: 'category.name', weight: 1.2 },
  { path: 'category.slug', weight: 0.8 },
  { path: 'description', weight: 0.4 },
]

interface PublicProductCandidate {
  id: string
  name: string
  description: string
  category: { name: string; slug: string } | null
}

const PUBLIC_PRODUCT_RANKING: SearchRankConfig<PublicProductCandidate> = {
  primary: [{ get: (candidate) => candidate.name }],
  secondary: [
    { get: (candidate) => candidate.category?.name ?? null, weight: 1.2 },
    { get: (candidate) => candidate.category?.slug ?? null, weight: 0.8 },
    { get: (candidate) => candidate.description, weight: 0.4 },
  ],
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
    ...(query.category
      ? {
          category: {
            isActive: true,
            ...(UUID_PATTERN.test(query.category) ? { id: query.category } : { slug: query.category }),
          },
        }
      : { category: { isActive: true } }),
  }
  const searchWhere = buildSearchWhere<Prisma.ProductWhereInput>(query.search, PUBLIC_PRODUCT_SEARCH_FIELDS)
  if (searchWhere) Object.assign(where, searchWhere)

  const orderBy: Prisma.ProductOrderByWithRelationInput[] = query.sort === 'price_asc'
    ? [{ price: 'asc' }, { createdAt: 'desc' }]
    : query.sort === 'price_desc'
      ? [{ price: 'desc' }, { createdAt: 'desc' }]
      : query.sort === 'relevance' && query.search
        ? []
        : [{ createdAt: 'desc' }, { id: 'desc' }]

  let total = 0
  let products: ProductWithRatings[]
  if (orderBy.length === 0) {
    // Relevance sort with an active search: match in the database, then rank
    // the candidate set so the best matches can surface on any page.
    const candidates = await prisma.product.findMany({
      where,
      select: { id: true, name: true, description: true, category: { select: { name: true, slug: true } } },
      // Deterministic tie-break: equally-relevant matches surface newest first.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
    const ranked = rankSearchResults(candidates, query.search, PUBLIC_PRODUCT_RANKING)
    total = ranked.length
    const pageIds = ranked
      .slice((query.page - 1) * query.limit, query.page * query.limit)
      .map((candidate) => candidate.id)
    products = pageIds.length > 0
      ? await prisma.product.findMany({ where: { id: { in: pageIds } }, include: productInclude })
      : []
    const rankIndex = new Map(pageIds.map((id, index) => [id, index]))
    products.sort((left, right) => (rankIndex.get(left.id) ?? 0) - (rankIndex.get(right.id) ?? 0))
  } else {
    const [countResult, productResult] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({ where, include: productInclude, orderBy, skip: (query.page - 1) * query.limit, take: query.limit }),
    ])
    total = countResult
    products = productResult
  }

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