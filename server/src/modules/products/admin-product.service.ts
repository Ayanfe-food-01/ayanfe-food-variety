import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { adminProductInclude, toAdminProduct } from './admin-product.mapper.js'
import type { AdminProductQuery, Product } from './product.types.js'

const LOW_STOCK_THRESHOLD = 5

export async function listAdminProducts(query: AdminProductQuery) {
  const where: Prisma.ProductWhereInput = {}
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ]
  }
  if (query.categoryIds?.length) where.categoryId = { in: query.categoryIds }
  else if (query.categoryId) where.categoryId = query.categoryId
  if (query.availability === 'active') where.isActive = true
  if (query.availability === 'inactive') where.isActive = false
  if (query.availability === 'out-of-stock') {
    where.isActive = true
    where.stockQuantity = 0
  }
  if (query.stockStatus === 'in-stock') where.stockQuantity = { gt: LOW_STOCK_THRESHOLD }
  if (query.stockStatus === 'low-stock') where.stockQuantity = { gt: 0, lte: LOW_STOCK_THRESHOLD }
  if (query.stockStatus === 'out-of-stock') where.stockQuantity = 0
  if (query.featured !== undefined) where.isFeatured = query.featured
  if (query.discount === 'on-sale') where.discountType = { not: null }
  if (query.discount === 'no-discount') where.discountType = null
  if (query.productType === 'with-options') where.options = { some: {} }
  if (query.productType === 'simple') where.options = { none: {} }
  if (query.wholesale === 'enabled') where.wholesalePackages = { some: { isActive: true } }
  if (query.wholesale === 'not-configured') where.wholesalePackages = { none: {} }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {
      ...(query.minPrice !== undefined ? { gte: new Prisma.Decimal(query.minPrice) } : {}),
      ...(query.maxPrice !== undefined ? { lte: new Prisma.Decimal(query.maxPrice) } : {}),
    }
  }

  const orderBy = query.sort === 'oldest'
    ? { createdAt: 'asc' as const }
    : query.sort === 'updated'
      ? { updatedAt: 'desc' as const }
      : query.sort === 'price_asc'
        ? { price: 'asc' as const }
        : query.sort === 'price_desc'
          ? { price: 'desc' as const }
          : query.sort === 'stock_asc'
            ? { stockQuantity: 'asc' as const }
            : query.sort === 'stock_desc'
              ? { stockQuantity: 'desc' as const }
              : { createdAt: 'desc' as const }

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: adminProductInclude,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])

  return {
    products: products.map(toAdminProduct),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  }
}

export async function getAdminProduct(id: string): Promise<Product> {
  const product = await prisma.product.findUnique({ where: { id }, include: adminProductInclude })
  if (!product) throw new HttpError(404, 'Product not found.')
  return toAdminProduct(product)
}

export async function updateProductStatus(id: string, isActive: boolean): Promise<Product> {
  const product = await prisma.product.update({
    where: { id },
    data: { isActive },
    include: adminProductInclude,
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Product not found.')
    }
    throw error
  })
  return toAdminProduct(product)
}

export async function updateProductFeatured(id: string, isFeatured: boolean): Promise<Product> {
  const product = await prisma.product.update({
    where: { id },
    data: { isFeatured },
    include: adminProductInclude,
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Product not found.')
    }
    throw error
  })
  return toAdminProduct(product)
}

export async function deleteProduct(id: string): Promise<{ name: string; images: string[] }> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const lockedProducts = await transaction.$queryRaw<Array<{ id: string; name: string; image: string }>>(
        Prisma.sql`SELECT id, name, image
          FROM products
          WHERE id = ${id}::uuid
          FOR UPDATE`,
      )
      const product = lockedProducts[0]
      if (!product) throw new HttpError(404, 'Product not found.')

      const [orderItemCount, cartItemCount, stockAdjustmentCount, imageRows] = await Promise.all([
        transaction.orderItem.count({ where: { productId: id } }),
        transaction.customerCartItem.count({ where: { productId: id } }),
        transaction.productStockAdjustment.count({ where: { productId: id } }),
        transaction.productImage.findMany({ where: { productId: id }, select: { url: true } }),
      ])

      if (orderItemCount > 0) {
        console.warn(JSON.stringify({
          event: 'product_delete_blocked',
          reason: 'historical_order_items',
          productId: id,
          dependencyCount: orderItemCount,
        }))
        throw new HttpError(
          409,
          'This product has historical order records and must be deactivated or archived instead.',
        )
      }

      if (stockAdjustmentCount > 0) {
        console.warn(JSON.stringify({
          event: 'product_delete_blocked',
          reason: 'inventory_history',
          productId: id,
          dependencyCount: stockAdjustmentCount,
        }))
        throw new HttpError(
          409,
          'This product has inventory history and must be deactivated or archived instead.',
        )
      }

      // Cart items are disposable and are safe to remove only after the
      // protected historical relationships above have been checked.
      if (cartItemCount > 0) {
        await transaction.customerCartItem.deleteMany({ where: { productId: id } })
      }
      await transaction.product.delete({ where: { id } })
      console.info(JSON.stringify({
        event: 'product_deleted',
        productId: id,
        removedCartItemCount: cartItemCount,
      }))
      return {
        name: product.name,
        images: Array.from(new Set([product.image, ...imageRows.map((image) => image.url)].filter(Boolean))),
      }
    })
  } catch (error: unknown) {
    if (error instanceof HttpError) throw error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw new HttpError(404, 'Product not found.')
      if (error.code === 'P2003') {
        throw new HttpError(
          409,
          'This product has protected records and must be deactivated or archived instead.',
        )
      }
    }
    throw error
  }
}