import { prisma } from '../../config/prisma.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import type { ProductWholesalePricing } from './product.types.js'

export const isWholesaleCustomer = (user: AuthenticatedUser | null | undefined): boolean => {
  return Boolean(user && user.role === 'CUSTOMER' && user.shoppingMode === 'WHOLESALE')
}

// The lowest per-package price a wholesale buyer can start from, used to show a
// "from" price on product cards. A product qualifies for wholesale when it has
// at least one active wholesale package.
export const getProductWholesaleFromMap = async (productIds: string[]): Promise<Map<string, string | null>> => {
  const map = new Map<string, string | null>()
  if (productIds.length === 0) return map

  const rows = await prisma.wholesalePackage.findMany({
    where: { productId: { in: productIds }, isActive: true },
    select: { productId: true, price: true },
    orderBy: { price: 'asc' as const },
  })

  for (const row of rows) {
    if (!map.has(row.productId)) {
      map.set(row.productId, row.price.toString())
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

  const packages = await prisma.wholesalePackage.findMany({
    where: { productId, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, productId: true, productOptionId: true, name: true, unitsPerPackage: true, price: true, isActive: true },
  })

  return {
    productId,
    packages: packages.map((pkg) => ({
      packageId: pkg.id,
      productId: pkg.productId,
      productOptionId: pkg.productOptionId,
      name: pkg.name,
      unitsPerPackage: pkg.unitsPerPackage,
      price: pkg.price.toString(),
      isActive: pkg.isActive,
    })),
  }
}
