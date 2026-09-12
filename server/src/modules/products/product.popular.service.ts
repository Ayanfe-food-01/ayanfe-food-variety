import { OrderStatus, PaymentStatus, Prisma, ReviewStatus } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { calculateDiscountedPrice } from './product.pricing.js'
import { toOption } from './product.mapper.js'
import { getWishlistProductIds } from './product.list.service.js'
import { getProductWholesaleFromMap } from './product.wholesale.service.js'
import type { Product, ProductOption, PublicProduct, PublicProductPage, PublicProductQuery } from './product.types.js'

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

  const wishlistProductIds = await getWishlistProductIds(
    products.map((product) => product.id),
    wishlistUserId,
  )
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