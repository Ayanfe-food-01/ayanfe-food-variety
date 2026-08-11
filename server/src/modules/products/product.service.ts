import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type { Product } from './product.types.js'

type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true }
}>

const toProduct = (product: ProductWithCategory): Product => ({
  id: product.id,
  categoryId: product.categoryId,
  categoryName: product.category.name,
  categorySlug: product.category.slug,
  name: product.name,
  slug: product.slug,
  description: product.description,
  price: product.price.toString(),
  unit: product.unit,
  image: product.image,
  isActive: product.isActive,
  createdAt: product.createdAt.toISOString(),
  updatedAt: product.updatedAt.toISOString(),
})

export async function getProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  })

  return products.map(toProduct)
}

export async function getProductById(identifier: string): Promise<Product | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)
  const product = await prisma.product.findFirst({
    where: isUuid
      ? { isActive: true, OR: [{ id: identifier }, { slug: identifier }] }
      : { isActive: true, slug: identifier },
    include: { category: true },
  })

  return product ? toProduct(product) : null
}