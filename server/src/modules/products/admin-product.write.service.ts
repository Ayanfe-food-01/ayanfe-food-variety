import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { createLowStockNotificationIfNeeded, recordStockAdjustment } from '../inventory/inventory.service.js'
import { adminProductInclude, toAdminProduct } from './admin-product.mapper.js'
import { reconcileOptions, syncWholesaleTiers } from './admin-product.options.service.js'
import type { Product, ProductInput } from './product.types.js'

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