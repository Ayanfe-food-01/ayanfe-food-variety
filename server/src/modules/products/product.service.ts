import { OrderStatus, PaymentStatus, Prisma, ReviewStatus } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import type {
  Product,
  ProductOption,
  ProductWholesalePricing,
  PublicCategoryProductSection,
  PublicProduct,
  PublicProductPage,
  PublicProductQuery,
  WholesalePriceLookupInput,
  WholesalePriceLookupResult,
} from './product.types.js'
import { calculateDiscountedPrice } from './product.pricing.js'
import { assertWholesaleOrderable, findWholesaleTier, wholesaleUnitPriceFromOption } from './wholesale.pricing.js'
import { productInclude, toOption, toProduct } from './product.mapper.js'
import type { ProductWithRatings } from './product.mapper.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const toPublicProduct = (product: ProductWithRatings, isWishlisted = false, wholesaleFrom?: string | null): PublicProduct => {
  return toProduct(product, isWishlisted, wholesaleFrom)
}

interface PopularProductRow {
  id: string
  categoryId: string
  categoryName: string
  categorySlug: string
  name: string
  slug: string
  description: string
  price: Prisma.Decimal
  discountType: Product['discountType']
  discountValue: Prisma.Decimal | null
  discountedPrice: Prisma.Decimal
  deliveryFee: Prisma.Decimal
  unit: string
  image: string
  isActive: boolean
  isFeatured: boolean
  images: string[]
  stockQuantity: number
  createdAt: Date
  updatedAt: Date
  orderedQuantity: bigint
  averageRating: number | null
  reviewCount: number
}

const toPopularProduct = (product: PopularProductRow, images: string[], options: ProductOption[], wholesaleFrom?: string | null): PublicProduct => ({
  id: product.id,
  categoryId: product.categoryId,
  categoryName: product.categoryName,
  categorySlug: product.categorySlug,
  name: product.name,
  slug: product.slug,
  description: product.description,
  price: product.price.toString(),
  discountType: product.discountType,
  discountValue: product.discountValue?.toString() ?? null,
  discountedPrice: calculateDiscountedPrice(
    product.price,
    product.discountType,
    product.discountValue,
  ).toString(),
  deliveryFee: product.deliveryFee.toString(),
  unit: product.unit,
  image: product.image,
  images,
  options,
  isActive: product.isActive,
  isFeatured: product.isFeatured,
  stockQuantity: product.stockQuantity,
  availabilityStatus: product.stockQuantity === 0
    ? 'OUT_OF_STOCK'
    : product.stockQuantity <= 5
      ? 'LOW_STOCK'
      : 'IN_STOCK',
  isAvailable: product.isActive && product.stockQuantity > 0,
  isWishlisted: false,
  wholesaleFrom: wholesaleFrom ?? undefined,
  averageRating: product.averageRating,
  reviewCount: product.reviewCount,
  createdAt: product.createdAt.toISOString(),
  updatedAt: product.updatedAt.toISOString(),
})

export const isWholesaleCustomer = (user: AuthenticatedUser | null | undefined): boolean => {
  return Boolean(user && user.role === 'CUSTOMER' && user.shoppingMode === 'WHOLESALE')
}

interface WholesaleFromTier {
  minQuantity: number
  maxQuantity: number | null
  price: Prisma.Decimal
}

const wholesaleFromPrice = (moq: number | null, tiers: WholesaleFromTier[]): string | null => {
  if (tiers.length === 0) return null
  const quantity = moq ?? 1
  const applicable = findWholesaleTier(tiers, quantity) ?? tiers[0]!
  return applicable.price.toString()
}

const getProductWholesaleFromMap = async (productIds: string[]): Promise<Map<string, string | null>> => {
  const map = new Map<string, string | null>()
  if (productIds.length === 0) return map

  const rows = await prisma.productOption.findMany({
    where: {
      productId: { in: productIds },
      isActive: true,
      wholesalePriceTiers: { some: {} },
    },
    select: {
      productId: true,
      wholesaleMoq: true,
      wholesalePriceTiers: {
        orderBy: { minQuantity: 'asc' },
        select: { minQuantity: true, maxQuantity: true, price: true },
      },
    },
  })

  for (const row of rows) {
    const candidate = wholesaleFromPrice(row.wholesaleMoq, row.wholesalePriceTiers)
    if (candidate === null) continue
    const current = map.get(row.productId)
    if (current === undefined || Number(candidate) < Number(current)) {
      map.set(row.productId, candidate)
    }
  }
  return map
}

export async function getProductWholesalePricing(productId: string): Promise<ProductWholesalePricing | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true, category: { isActive: true } },
    select: { id: true },
  })
  if (!product) return null

  const options = await prisma.productOption.findMany({
    where: { productId, isActive: true, wholesalePriceTiers: { some: {} } },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    include: { wholesalePriceTiers: { orderBy: { minQuantity: 'asc' } } },
  })

  return {
    productId,
    options: options.map((option) => ({
      optionId: option.id,
      label: option.label,
      moq: option.wholesaleMoq,
      tiers: option.wholesalePriceTiers.map((tier) => ({
        minQuantity: tier.minQuantity,
        maxQuantity: tier.maxQuantity,
        price: tier.price.toString(),
      })),
    })),
  }
}

export async function lookupWholesalePrice(input: WholesalePriceLookupInput): Promise<WholesalePriceLookupResult> {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, isActive: true, category: { isActive: true } },
    select: { id: true },
  })
  if (!product) throw new HttpError(404, 'The product was not found.')

  const option = await prisma.productOption.findFirst({
    where: { id: input.productOptionId, productId: input.productId },
  })
  if (!option || !option.isActive) throw new HttpError(404, 'The product size was not found.')

  const tiers = await prisma.wholesalePriceTier.findMany({
    where: { productId: input.productId, productOptionId: input.productOptionId },
    orderBy: { minQuantity: 'asc' },
  })
  if (tiers.length === 0) {
    throw new HttpError(409, 'Wholesale pricing is not available for this size yet.')
  }

  assertWholesaleOrderable({ wholesaleMoq: option.wholesaleMoq, wholesalePriceTiers: tiers }, input.quantity)

  const tier = findWholesaleTier(tiers, input.quantity)!
  const unitPrice = wholesaleUnitPriceFromOption({ wholesaleMoq: option.wholesaleMoq, wholesalePriceTiers: tiers }, input.quantity)!

  return {
    productId: input.productId,
    productOptionId: input.productOptionId,
    optionLabel: option.label,
    quantity: input.quantity,
    moq: option.wholesaleMoq,
    unitPrice: unitPrice.toString(),
    tier: { minQuantity: tier.minQuantity, maxQuantity: tier.maxQuantity, price: tier.price.toString() },
  }
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

  const wishlistProductIds = wishlistUserId
    ? new Set((await prisma.wishlistItem.findMany({
        where: { userId: wishlistUserId, productId: { in: products.map((product) => product.id) } },
        select: { productId: true },
      })).map((item) => item.productId))
    : new Set<string>()

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
  const wishlistProductIds = wishlistUserId
    ? new Set((await prisma.wishlistItem.findMany({
        where: { userId: wishlistUserId, productId: { in: products.map((product) => product.id) } },
        select: { productId: true },
      })).map((item) => item.productId))
    : new Set<string>()

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

export async function getPopularProducts(query: PublicProductQuery, wishlistUserId?: string, includeWholesale = false): Promise<PublicProductPage> {
  const products = await prisma.$queryRaw<PopularProductRow[]>(Prisma.sql`
    SELECT
      p.id,
      p.category_id AS "categoryId",
      c.name AS "categoryName",
      c.slug AS "categorySlug",
      p.name,
      p.slug,
      p.description,
      p.price,
      p.discount_type AS "discountType",
      p.discount_value AS "discountValue",
      p.delivery_fee AS "deliveryFee",
      p.unit,
      p.image,
      p.is_active AS "isActive",
      p.is_featured AS "isFeatured",
      p.stock_quantity AS "stockQuantity",
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt",
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.quantity ELSE 0 END), 0)::bigint AS "orderedQuantity",
      (
        SELECT AVG(r.rating)::double precision
        FROM reviews r
        WHERE r.product_id = p.id AND r.status = ${ReviewStatus.APPROVED}::"ReviewStatus"
      ) AS "averageRating",
      (
        SELECT COUNT(*)
        FROM reviews r
        WHERE r.product_id = p.id AND r.status = ${ReviewStatus.APPROVED}::"ReviewStatus"
      )::int AS "reviewCount"
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    LEFT JOIN order_items oi ON oi.product_id = p.id
    LEFT JOIN orders o
      ON o.id = oi.order_id
      AND o.payment_status = ${PaymentStatus.PAID}::"PaymentStatus"
      AND o.order_status <> ${OrderStatus.CANCELLED}::"OrderStatus"
    WHERE p.is_active = true
      AND c.is_active = true
    GROUP BY
      p.id,
      p.category_id,
      c.name,
      c.slug,
      p.name,
      p.slug,
      p.description,
      p.price,
      p.discount_type,
      p.discount_value,
      p.delivery_fee,
      p.unit,
      p.image,
      p.is_active,
      p.is_featured,
      p.stock_quantity,
      p.created_at,
      p.updated_at
    ORDER BY "orderedQuantity" DESC, p.created_at DESC, p.id DESC
    LIMIT ${query.limit}
    OFFSET ${(query.page - 1) * query.limit}
  `)

  const wishlistProductIds = wishlistUserId
    ? new Set((await prisma.wishlistItem.findMany({
        where: { userId: wishlistUserId, productId: { in: products.map((product) => product.id) } },
        select: { productId: true },
      })).map((item) => item.productId))
    : new Set<string>()
  const imageRows = products.length
    ? await prisma.productImage.findMany({
        where: { productId: { in: products.map((product) => product.id) } },
        orderBy: { sortOrder: 'asc' },
        select: { productId: true, url: true },
      })
    : []
  const imagesByProduct = new Map<string, string[]>()
  for (const image of imageRows) {
    const current = imagesByProduct.get(image.productId) ?? []
    current.push(image.url)
    imagesByProduct.set(image.productId, current)
  }

  const productIds = products.map((product) => product.id)
  const optionRows = productIds.length
    ? await prisma.productOption.findMany({
        where: { productId: { in: productIds }, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      })
    : []
  const optionsByProduct = new Map<string, ProductOption[]>()
  for (const row of optionRows) {
    const current = optionsByProduct.get(row.productId) ?? []
    current.push(toOption(row))
    optionsByProduct.set(row.productId, current)
  }

  const wholesaleFromMap = includeWholesale ? await getProductWholesaleFromMap(productIds) : null

  return {
    products: products.map((product) => ({
      ...toPopularProduct(
        product,
        imagesByProduct.get(product.id) ?? [product.image],
        optionsByProduct.get(product.id) ?? [],
        wholesaleFromMap?.get(product.id),
      ),
      isWishlisted: wishlistProductIds.has(product.id),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: products.length,
      totalPages: 1,
    },
  }
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
  const wishlistProductIds = wishlistUserId
    ? new Set((await prisma.wishlistItem.findMany({
        where: { userId: wishlistUserId, productId: { in: products.map((product) => product.id) } },
        select: { productId: true },
      })).map((item) => item.productId))
    : new Set<string>()

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
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)
  const product = await prisma.product.findFirst({
    where: isUuid
      ? { isActive: true, category: { isActive: true }, OR: [{ id: identifier }, { slug: identifier }] }
      : { isActive: true, category: { isActive: true }, slug: identifier },
    include: productInclude,
  })

  if (!product) return null
  const isWishlisted = wishlistUserId
    ? Boolean(await prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId: wishlistUserId, productId: product.id } },
        select: { id: true },
      }))
    : false
  const wholesaleFromMap = includeWholesale ? await getProductWholesaleFromMap([product.id]) : null
  return toPublicProduct(product, isWishlisted, wholesaleFromMap?.get(product.id))
}
