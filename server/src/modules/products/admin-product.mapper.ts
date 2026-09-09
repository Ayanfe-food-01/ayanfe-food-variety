import { Prisma } from '@prisma/client'
import { productInclude, toOption, toProduct } from './product.mapper.js'
import type { Product, ProductOption } from './product.types.js'

export const adminProductInclude = {
  ...productInclude,
  options: {
    ...productInclude.options,
    include: { wholesalePriceTiers: { orderBy: { minQuantity: 'asc' as const } } },
  },
  wholesalePackages: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
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

const toAdminWholesalePackage = (pkg: AdminProduct['wholesalePackages'][number]) => ({
  id: pkg.id,
  name: pkg.name,
  unitsPerPackage: pkg.unitsPerPackage,
  price: pkg.price.toString(),
  isActive: pkg.isActive,
  sortOrder: pkg.sortOrder,
})

export const toAdminProduct = (product: AdminProduct): Product => ({
  ...toProduct(product),
  options: product.options.filter((option) => option.isActive).map(toAdminOption),
  archivedOptions: product.options.filter((option) => !option.isActive).map(toAdminOption),
  wholesalePackages: product.wholesalePackages.map(toAdminWholesalePackage),
})