import { Prisma } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import type { ProductInput, ProductOptionInput } from './product.types.js'

export const syncWholesaleTiers = async (
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

/**
 * Reconciles the submitted option set with the product's current options:
 * live options are updated (kept when they are already active), removed
 * options are archived if they are referenced by orders/carts (so historical
 * records keep a stable label) or deleted otherwise, and removed options that
 * come back with the same label are revived in place.
 */
export async function reconcileOptions(
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
          lowStockThreshold: option.lowStockThreshold ?? null,
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
            lowStockThreshold: option.lowStockThreshold ?? null,
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
            lowStockThreshold: option.lowStockThreshold ?? null,
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