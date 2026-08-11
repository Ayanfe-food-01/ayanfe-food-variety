import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { AdminProductQuery, Product, ProductInput, PublicProduct } from './product.types.js'

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
  stockQuantity: product.stockQuantity,
  availabilityStatus: product.stockQuantity === 0
    ? 'OUT_OF_STOCK'
    : product.stockQuantity <= 5
      ? 'LOW_STOCK'
      : 'IN_STOCK',
  isAvailable: product.isActive && product.stockQuantity > 0,
  createdAt: product.createdAt.toISOString(),
  updatedAt: product.updatedAt.toISOString(),
})

const toPublicProduct = (product: ProductWithCategory): PublicProduct => {
  const response = toProduct(product)
  const { stockQuantity: _stockQuantity, ...publicProduct } = response
  return publicProduct
}

export async function getProducts(): Promise<PublicProduct[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  })

  return products.map(toPublicProduct)
}

export async function getProductById(identifier: string): Promise<PublicProduct | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)
  const product = await prisma.product.findFirst({
    where: isUuid
      ? { isActive: true, OR: [{ id: identifier }, { slug: identifier }] }
      : { isActive: true, slug: identifier },
    include: { category: true },
  })

  if (!product) return null
  return toPublicProduct(product)
}

const productInclude = { category: true } satisfies Prisma.ProductInclude

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

const validateCategory = async (categoryId: string) => {
  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } })
  if (!category) throw new HttpError(400, 'The selected category does not exist.')
}

const toAdminProduct = (product: Prisma.ProductGetPayload<{ include: typeof productInclude }>): Product => toProduct(product)

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
      include: productInclude,
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
  const product = await prisma.product.findUnique({ where: { id }, include: productInclude })
  if (!product) throw new HttpError(404, 'Product not found.')
  return toAdminProduct(product)
}

export async function createProduct(input: ProductInput): Promise<Product> {
  await validateCategory(input.categoryId)
  const product = await prisma.product.create({
    data: {
      categoryId: input.categoryId,
      name: input.name,
      slug: await uniqueSlug(input.name),
      description: input.description,
      price: input.price,
      unit: input.unit,
      image: input.image ?? '',
      isActive: input.isActive,
      stockQuantity: input.stockQuantity,
    },
    include: productInclude,
  })
  return toAdminProduct(product)
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  await validateCategory(input.categoryId)
  const current = await prisma.product.findUnique({ where: { id }, select: { id: true } })
  if (!current) throw new HttpError(404, 'Product not found.')
  const product = await prisma.product.update({
    where: { id },
    data: {
      categoryId: input.categoryId,
      name: input.name,
      slug: await uniqueSlug(input.name, id),
      description: input.description,
      price: input.price,
      unit: input.unit,
      ...(input.image ? { image: input.image } : {}),
      isActive: input.isActive,
      stockQuantity: input.stockQuantity,
    },
    include: productInclude,
  })
  return toAdminProduct(product)
}

export async function updateProductStatus(id: string, isActive: boolean): Promise<Product> {
  const product = await prisma.product.update({
    where: { id },
    data: { isActive },
    include: productInclude,
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Product not found.')
    }
    throw error
  })
  return toAdminProduct(product)
}