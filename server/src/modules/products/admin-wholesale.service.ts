import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { WholesalePackageInput } from './product.types.js'

type PackageRow = Awaited<ReturnType<typeof prisma.wholesalePackage.findFirst>>

const serializePackage = (pkg: PackageRow) => {
  if (!pkg) return pkg
  return {
    id: pkg.id,
    productId: pkg.productId,
    name: pkg.name,
    unitsPerPackage: pkg.unitsPerPackage,
    price: pkg.price.toString(),
    isActive: pkg.isActive,
    sortOrder: pkg.sortOrder,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
  }
}

// Prevents invalid duplicate wholesale package configs for the same product:
// a package name must be unique and two packages must not share the same
// units-per-package + price (which would produce identical, confusing options).
const assertPackageConfigValid = async (
  tx: Prisma.TransactionClient,
  productId: string,
  input: WholesalePackageInput,
  excludeId?: string,
): Promise<void> => {
  const others = await tx.wholesalePackage.findMany({ where: { productId, ...(excludeId ? { id: { not: excludeId } } : {}) } })
  const nameKey = input.name.toLowerCase()
  const duplicateName = others.find((row) => row.name.toLowerCase() === nameKey)
  if (duplicateName) throw new HttpError(400, `A wholesale package named "${input.name}" already exists for this product.`)
  const duplicateConfig = others.find(
    (row) => row.unitsPerPackage === input.unitsPerPackage && row.price.toString() === input.price,
  )
  if (duplicateConfig) {
    throw new HttpError(400, 'A wholesale package with the same units and price already exists for this product.')
  }
}

export async function listAdminWholesalePackages(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
  if (!product) throw new HttpError(404, 'Product not found.')
  const rows = await prisma.wholesalePackage.findMany({
    where: { productId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return rows.map(serializePackage)
}

export async function createAdminWholesalePackage(productId: string, input: WholesalePackageInput) {
  return prisma.$transaction(async (transaction) => {
    const product = await transaction.product.findUnique({ where: { id: productId }, select: { id: true } })
    if (!product) throw new HttpError(404, 'Product not found.')
    await assertPackageConfigValid(transaction, productId, input)
    const created = await transaction.wholesalePackage.create({
      data: {
        productId,
        name: input.name,
        unitsPerPackage: input.unitsPerPackage,
        price: input.price,
        isActive: input.isActive,
        sortOrder: input.sortOrder ?? 0,
      },
    })
    return created
  }).then((row) => serializePackage(row))
}

export async function updateAdminWholesalePackage(packageId: string, input: WholesalePackageInput) {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.wholesalePackage.findUnique({ where: { id: packageId } })
    if (!existing) throw new HttpError(404, 'Wholesale package not found.')
    await assertPackageConfigValid(transaction, existing.productId, input, existing.id)
    const updated = await transaction.wholesalePackage.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        unitsPerPackage: input.unitsPerPackage,
        price: input.price,
        isActive: input.isActive,
        sortOrder: input.sortOrder ?? existing.sortOrder,
      },
    })
    return updated
  }).then((row) => serializePackage(row))
}

export async function toggleAdminWholesalePackageActive(packageId: string, isActive: boolean) {
  const existing = await prisma.wholesalePackage.findUnique({ where: { id: packageId } })
  if (!existing) throw new HttpError(404, 'Wholesale package not found.')
  return prisma.wholesalePackage.update({
    where: { id: packageId },
    data: { isActive },
  }).then(serializePackage)
}

export async function deleteAdminWholesalePackage(packageId: string) {
  const existing = await prisma.wholesalePackage.findUnique({ where: { id: packageId } })
  if (!existing) throw new HttpError(404, 'Wholesale package not found.')

  const cartRefCount = await prisma.customerCartItem.count({ where: { wholesalePackageId: packageId } })
  if (cartRefCount > 0) {
    throw new HttpError(409, 'This wholesale package is still in a customer cart. Deactivate it instead of deleting it.')
  }

  // Order items keep a snapshot (name/units/price), and their FK is SET NULL,
  // so deleting a package never alters historical orders.
  await prisma.wholesalePackage.delete({ where: { id: packageId } })
  return { id: packageId }
}
