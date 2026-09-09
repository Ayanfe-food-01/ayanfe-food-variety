import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { WholesalePackageInput } from './product.types.js'
import { parseWholesalePackageInput } from './wholesale-package.validator.js'

type PackageRow = Awaited<ReturnType<typeof prisma.wholesalePackage.findFirst>>

const serializePackage = (pkg: PackageRow) => {
  if (!pkg) return pkg
  return {
    id: pkg.id,
    productId: pkg.productId,
    productOptionId: pkg.productOptionId,
    name: pkg.name,
    unitsPerPackage: pkg.unitsPerPackage,
    price: pkg.price.toString(),
    isActive: pkg.isActive,
    sortOrder: pkg.sortOrder,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
  }
}

// A wholesale package belongs to a specific unit/size (ProductOption). Resolve
// and validate the supplied productOptionId against the product; null means the
// product's single unit (a product without size variants). undefined is treated
// as "not specified" by callers.
const resolveProductOptionId = async (
  tx: Prisma.TransactionClient,
  productId: string,
  productOptionId: string | null | undefined,
): Promise<string | null> => {
  if (productOptionId === null || productOptionId === undefined) return null
  const option = await tx.productOption.findUnique({ where: { id: productOptionId } })
  if (!option || option.productId !== productId) {
    throw new HttpError(400, 'The selected unit/size is invalid for this product.')
  }
  return option.id
}

// Prevents invalid duplicate wholesale package configs for the same product and
// unit/size: a package name must be unique within that unit/size and two
// packages must not share the same units-per-package + price within that
// unit/size (which would produce identical, confusing options).
const assertPackageConfigValid = async (
  tx: Prisma.TransactionClient,
  productId: string,
  productOptionId: string | null,
  input: WholesalePackageInput,
  excludeId?: string,
): Promise<void> => {
  const others = await tx.wholesalePackage.findMany({ where: { productId, ...(excludeId ? { id: { not: excludeId } } : {}) } })
  const optionScope = productOptionId ?? ''
  const nameKey = `${optionScope}|${input.name.toLowerCase()}`
  const duplicateName = others.find((row) => `${row.productOptionId ?? ''}|${row.name.toLowerCase()}` === nameKey)
  if (duplicateName) throw new HttpError(400, `A wholesale package named "${input.name}" already exists for this unit/size.`)

  const configKey = `${optionScope}|${input.unitsPerPackage}|${new Prisma.Decimal(input.price).toFixed(2)}`
  const duplicateConfig = others.find(
    (row) => `${row.productOptionId ?? ''}|${row.unitsPerPackage}|${row.price.toFixed(2)}` === configKey,
  )
  if (duplicateConfig) {
    throw new HttpError(400, 'A wholesale package with the same units and price already exists for this unit/size.')
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
  const parsed = parseWholesalePackageInput(input)
  return prisma.$transaction(async (transaction) => {
    const product = await transaction.product.findUnique({ where: { id: productId }, select: { id: true } })
    if (!product) throw new HttpError(404, 'Product not found.')
    const productOptionId = await resolveProductOptionId(transaction, productId, parsed.productOptionId)
    await assertPackageConfigValid(transaction, productId, productOptionId, parsed)
    const created = await transaction.wholesalePackage.create({
      data: {
        productId,
        productOptionId,
        name: parsed.name,
        unitsPerPackage: parsed.unitsPerPackage,
        price: parsed.price,
        isActive: parsed.isActive,
        sortOrder: parsed.sortOrder ?? 0,
      },
    })
    return created
  }).then((row) => serializePackage(row))
}

export async function updateAdminWholesalePackage(packageId: string, input: WholesalePackageInput) {
  const parsed = parseWholesalePackageInput(input)
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.wholesalePackage.findUnique({ where: { id: packageId } })
    if (!existing) throw new HttpError(404, 'Wholesale package not found.')
    const productOptionId = parsed.productOptionId === undefined
      ? existing.productOptionId
      : await resolveProductOptionId(transaction, existing.productId, parsed.productOptionId)
    await assertPackageConfigValid(transaction, existing.productId, productOptionId, parsed, existing.id)
    const updated = await transaction.wholesalePackage.update({
      where: { id: existing.id },
      data: {
        productOptionId,
        name: parsed.name,
        unitsPerPackage: parsed.unitsPerPackage,
        price: parsed.price,
        isActive: parsed.isActive,
        sortOrder: parsed.sortOrder ?? existing.sortOrder,
      },
    })
    return updated
  }).then((row) => serializePackage(row))
}

export async function reorderAdminWholesalePackages(productId: string, orderedIds: string[]) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
  if (!product) throw new HttpError(404, 'Product not found.')
  const rows = await prisma.wholesalePackage.findMany({ where: { productId }, select: { id: true } })
  const existingIds = new Set(rows.map((row) => row.id))
  if (orderedIds.length !== existingIds.size || orderedIds.some((id) => !existingIds.has(id))) {
    throw new HttpError(400, "The package order does not match this product's wholesale packages.")
  }
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.wholesalePackage.update({ where: { id }, data: { sortOrder: index } }),
    ),
  )
  return listAdminWholesalePackages(productId)
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
