import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { AdminProductQuery, Product, ProductInput, ProductOption, ProductOptionInput } from './product.types.js'
import { createLowStockNotificationIfNeeded, recordStockAdjustment } from '../inventory/inventory.service.js'
import { productInclude, toOption, toProduct } from './product.mapper.js'

const adminProductInclude = {
  ...productInclude,
  options: {
    ...productInclude.options,
    include: { wholesalePriceTiers: { orderBy: { minQuantity: 'asc' as const } } },
  },
} satisfies Prisma.ProductInclude

type AdminProduct = Prisma.ProductGetPayload<{ include: typeof adminProductInclude }>

type AdminProductOptionRow = AdminProduct['options'][number]

const toAdminOption = (option: AdminProductOptionRow): ProductOption => ({
  ...toOption(option),
  wholesaleMoq: option.wholesaleMoq,
  wholesalePrices: option.wholesalePriceTiers.map((tier) => ({
    id: tier.id,
    minQuantity: tier.minQuantity,
    maxQuantity: tier.maxQuantity,
    price: tier.price.toString(),
  })),
})

const inputImages = (input: ProductInput): string[] => {
  const images = input.images?.filter(Boolean) ?? (input.image ? [input.image] : [])
  if (images.length === 0) throw new HttpError(400, 'At least one product image is required.')
  return images
}

const optionStockSum = (options: ProductInput['options']): number =>
  (options ?? []).reduce((sum, option) => sum + option.stockQuantity, 0)

const optionPriceFloor = (options: ProductInput['options'] | undefined): string => {
  if (!options || options.length === 0) return ''
  return options.reduce(
    (lowest, option) => (lowest === '' || Number(option.price) < Number(lowest) ? option.price : lowest),
    '',
  )
}

const optionCreateRows = (options: ProductInput['options'] | undefined) =>
  (options ?? []).map((option) => ({
    label: option.label,
    price: option.price,
    stockQuantity: option.stockQuantity,
    sortOrder: option.sortOrder,
    isActive: option.isActive ?? true,
    wholesaleMoq: option.wholesaleMoq ?? null,
  }))

const syncWholesaleTiers = async (
  transaction: Prisma.TransactionClient,
  productId: string,
  productOptionId: string,
  tiers: ProductOptionInput['wholesalePrices'],
): Promise<void> => {
  await transaction.wholesalePriceTier.deleteMany({ where: { productOptionId } })
  if (!tiers || tiers.length === 0) return
  await transaction.wholesalePriceTier.createMany({
    data: tiers.map((tier) => ({
      productId,
      productOptionId,
      minQuantity: tier.minQuantity,
      maxQuantity: tier.maxQuantity,
      price: tier.price,
    })),
  })
}

const ARCHIVE_PREFIX = 'Archived · '

const archivedOptionLabel = (label: string): string => `${ARCHIVE_PREFIX}${label}`

async function reconcileOptions(
  transaction: Prisma.TransactionClient,
  productId: string,
  submitted: NonNullable<ProductInput['options']>,
): Promise<void> {
  const existing = await transaction.productOption.findMany({ where: { productId } })
  const existingById = new Map(existing.map((option) => [option.id, option]))
  const archivedLabels = existing.reduce<Map<string, string>>((map, option) => {
    if (!option.isActive) {
      let originalLabel = option.label
      while (originalLabel.startsWith(ARCHIVE_PREFIX)) originalLabel = originalLabel.slice(ARCHIVE_PREFIX.length)
      map.set(originalLabel.toLowerCase(), option.id)
    }
    return map
  }, new Map())

  const upserted = new Set<string>()
  let sortOrder = 0
  for (const option of submitted) {
    const target = option.id ? existingById.get(option.id) : undefined
    const labelKey = option.label.toLowerCase()
    if (target) {
      const archived = archivedLabels.get(labelKey)
      if (archived && archived !== target.id) {
        throw new HttpError(400, `A removed option with the label "${option.label}" cannot be re-used for this product.`)
      }
      if (archived && archived === target.id) archivedLabels.delete(labelKey)
      upserted.add(target.id)
      await transaction.productOption.update({
        where: { id: target.id },
        data: {
          label: option.label,
          price: option.price,
          stockQuantity: option.stockQuantity,
          sortOrder,
          isActive: true,
          wholesaleMoq: option.wholesaleMoq ?? null,
        },
      })
      await syncWholesaleTiers(transaction, productId, target.id, option.wholesalePrices)
    } else {
      const revived = archivedLabels.get(labelKey)
      if (revived) {
        const alreadyLive = existing.some((row) => row.isActive && row.label.toLowerCase() === labelKey)
        if (alreadyLive) {
          throw new HttpError(400, `An option with the label "${option.label}" already exists for this product.`)
        }
        archivedLabels.delete(labelKey)
        upserted.add(revived)
        await transaction.productOption.update({
          where: { id: revived },
          data: {
            label: option.label,
            price: option.price,
            stockQuantity: option.stockQuantity,
            sortOrder,
            isActive: true,
            wholesaleMoq: option.wholesaleMoq ?? null,
          },
        })
        await syncWholesaleTiers(transaction, productId, revived, option.wholesalePrices)
      } else {
        const created = await transaction.productOption.create({
          data: {
            productId,
            label: option.label,
            price: option.price,
            stockQuantity: option.stockQuantity,
            sortOrder,
            isActive: true,
            wholesaleMoq: option.wholesaleMoq ?? null,
          },
        })
        await syncWholesaleTiers(transaction, productId, created.id, option.wholesalePrices)
        upserted.add(created.id)
      }
    }
    sortOrder += 1
  }

  const removed = existing.filter((option) => !upserted.has(option.id))
  if (removed.length > 0) {
    const removedIds = removed.map((option) => option.id)
    const [orderRefs, cartRefs] = await Promise.all([
      transaction.orderItem.groupBy({
        by: ['productOptionId'],
        where: { productOptionId: { in: removedIds } },
        _count: { _all: true },
      }),
      transaction.customerCartItem.groupBy({
        by: ['productOptionId'],
        where: { productOptionId: { in: removedIds } },
        _count: { _all: true },
      }),
    ])
    const referenced = new Set(
      [...orderRefs, ...cartRefs].map((row) => row.productOptionId) as string[],
    )
    for (const option of removed) {
      if (referenced.has(option.id)) {
        await transaction.productOption.update({
          where: { id: option.id },
          data: { label: option.label.startsWith(ARCHIVE_PREFIX) ? option.label : archivedOptionLabel(option.label), isActive: false },
        })
        continue
      }
      await transaction.productOption.delete({ where: { id: option.id } })
    }
  }
}

const slugify = (value: string): string => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || `product-${Date.now()}`
}

const uniqueSlug = async (name: string, excludedId?: string): Promise<string> => {
  const base = slugify(name)
  let slug = base
  let suffix = 2
  while (await prisma.product.findFirst({ where: { slug, ...(excludedId ? { NOT: { id: excludedId } } : {}) }, select: { id: true } })) {
    slug = `${base}-${suffix}`
    suffix += 1
  }
  return slug
}

export const validateProductCategory = async (categoryId: string) => {
  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true, isActive: true } })
  if (!category) throw new HttpError(400, 'The selected category does not exist.')
  if (!category.isActive) throw new HttpError(400, 'The selected category is inactive.')
}

const toAdminProduct = (product: AdminProduct): Product => ({
  ...toProduct(product),
  options: product.options.filter((option) => option.isActive).map(toAdminOption),
  archivedOptions: product.options.filter((option) => !option.isActive).map(toAdminOption),
})

export async function listAdminProducts(query: AdminProductQuery) {
  const where: Prisma.ProductWhereInput = {}
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ]
  }
  if (query.categoryId) where.categoryId = query.categoryId
  if (query.availability === 'active') where.isActive = true
  if (query.availability === 'inactive') where.isActive = false
  if (query.availability === 'out-of-stock') {
    where.isActive = true
    where.stockQuantity = 0
  }

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: adminProductInclude,
      orderBy: { createdAt: 'desc' },
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

export async function createProduct(input: ProductInput, adminId: string): Promise<Product> {
  await validateProductCategory(input.categoryId)
  const images = inputImages(input)
  const hasOptions = Boolean(input.options && input.options.length > 0)
  try {
    const product = await prisma.$transaction(async (transaction) => {
      const created = await transaction.product.create({
        data: {
          categoryId: input.categoryId,
          name: input.name,
          slug: await uniqueSlug(input.name),
          description: input.description,
          price: input.price ?? optionPriceFloor(input.options),
          discountType: input.discountType,
          discountValue: input.discountValue,
          deliveryFee: input.deliveryFee,
          unit: input.unit,
           image: images[0]!,
           images: { create: images.map((url, sortOrder) => ({ url, sortOrder })) },
          isActive: input.isActive,
          isFeatured: input.isFeatured,
          stockQuantity: input.stockQuantity ?? (hasOptions ? optionStockSum(input.options) : 0),
          ...(hasOptions ? { options: { create: optionCreateRows(input.options) } } : {}),
        },
        include: adminProductInclude,
      })
      if (created.options.length > 0) {
        for (const option of input.options ?? []) {
          const optionRow = created.options.find((row) => row.sortOrder === option.sortOrder)
          if (optionRow) {
            await syncWholesaleTiers(transaction, created.id, optionRow.id, option.wholesalePrices)
          }
        }
      }
      if (created.stockQuantity > 0) {
        const adjustment = await recordStockAdjustment(transaction, {
          productId: created.id,
          quantityDelta: created.stockQuantity,
          previousQuantity: 0,
          newQuantity: created.stockQuantity,
          reason: `Initial stock by admin ${adminId}`,
        })
        if (adjustment) {
          await createLowStockNotificationIfNeeded(transaction, {
            productId: created.id,
            productName: created.name,
            previousQuantity: 0,
            newQuantity: created.stockQuantity,
            stockAdjustmentId: adjustment.id,
            notifyFromZero: true,
          })
        }
      }
      return created
    }, { timeout: 15000 })
    return toAdminProduct(product)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'A product with this information already exists.')
    }
    throw error
  }
}

export async function updateProduct(input: ProductInput, adminId: string, id: string): Promise<Product> {
  await validateProductCategory(input.categoryId)
  const images = inputImages(input)
  const hasOptions = Boolean(input.options && input.options.length > 0)
  const replacesOptions = input.options !== undefined
  try {
    const product = await prisma.$transaction(async (transaction) => {
      const currentRows = await transaction.$queryRaw<Array<{ id: string; stock_quantity: number }>>(
        Prisma.sql`SELECT id, stock_quantity
          FROM products
          WHERE id = ${id}::uuid
          FOR UPDATE`,
      )
      const current = currentRows[0]
      if (!current) throw new HttpError(404, 'Product not found.')
      if (replacesOptions) await reconcileOptions(transaction, id, input.options!)
      const updated = await transaction.product.update({
        where: { id },
        data: {
          categoryId: input.categoryId,
          name: input.name,
          slug: await uniqueSlug(input.name, id),
          description: input.description,
          price: input.price ?? (hasOptions ? optionPriceFloor(input.options) : undefined),
          discountType: input.discountType,
          discountValue: input.discountValue,
          deliveryFee: input.deliveryFee,
          unit: input.unit,
           image: images[0]!,
           images: {
             deleteMany: {},
             create: images.map((url, sortOrder) => ({ url, sortOrder })),
           },
          isActive: input.isActive,
          isFeatured: input.isFeatured,
          stockQuantity: input.stockQuantity ?? (hasOptions ? optionStockSum(input.options) : undefined),
        },
        include: adminProductInclude,
      })
      if (updated.stockQuantity !== current.stock_quantity) {
        const adjustment = await recordStockAdjustment(transaction, {
          productId: id,
          quantityDelta: updated.stockQuantity - current.stock_quantity,
          previousQuantity: current.stock_quantity,
          newQuantity: updated.stockQuantity,
          reason: `Admin ${adminId} set stock to ${updated.stockQuantity}`,
        })
        if (adjustment) {
          await createLowStockNotificationIfNeeded(transaction, {
            productId: id,
            productName: updated.name,
            previousQuantity: current.stock_quantity,
            newQuantity: updated.stockQuantity,
            stockAdjustmentId: adjustment.id,
            notifyFromZero: true,
          })
        }
      }
      return updated
    }, { timeout: 60000 })
    return toAdminProduct(product)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'A product with this information already exists.')
    }
    throw error
  }
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
