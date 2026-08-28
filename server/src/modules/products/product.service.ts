import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type {
  AdminProductQuery,
  Product,
  ProductInput,
  ProductOption,
  PublicCategoryProductSection,
  PublicProduct,
  PublicProductPage,
  PublicProductQuery,
} from './product.types.js'
import { createLowStockNotificationIfNeeded, recordStockAdjustment } from '../inventory/inventory.service.js'
import { calculateDiscountedPrice } from './product.pricing.js'

type ProductWithCategory = Prisma.ProductGetPayload<{
  include: {
    category: true
    images: { orderBy: { sortOrder: 'asc' } }
    options: { orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] }
  }
}>

type ProductOptionRow = ProductWithCategory['options'][number]

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const productInclude = {
  category: true,
  images: { orderBy: { sortOrder: 'asc' } },
  options: { orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] },
} satisfies Prisma.ProductInclude

const normalizedImages = (product: Pick<ProductWithCategory, 'image' | 'images'>): string[] => {
  const storedImages = product.images.map((image) => image.url).filter(Boolean)
  const primaryImage = product.image || storedImages[0] || ''
  return primaryImage
    ? [primaryImage, ...storedImages.filter((image) => image !== primaryImage)]
    : storedImages
}

const toOption = (option: ProductOptionRow): ProductOption => ({
  id: option.id,
  label: option.label,
  price: option.price.toString(),
  stockQuantity: option.stockQuantity,
  sortOrder: option.sortOrder,
  isActive: option.isActive,
})

const normalizedOptions = (options: readonly ProductOptionRow[]): ProductOption[] =>
  options.filter((option) => option.isActive).map(toOption)

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
  }))

const toProduct = (product: ProductWithCategory, isWishlisted = false): Product => ({
  id: product.id,
  categoryId: product.categoryId,
  categoryName: product.category.name,
  categorySlug: product.category.slug,
  name: product.name,
  slug: product.slug,
  description: product.description,
  price: product.price.toString(),
  discountType: product.discountType,
  discountValue: product.discountValue?.toString() ?? null,
  discountedPrice: calculateDiscountedPrice(product.price, product.discountType, product.discountValue).toString(),
  deliveryFee: product.deliveryFee.toString(),
  unit: product.unit,
  image: product.image,
  images: normalizedImages(product),
  options: normalizedOptions(product.options),
  isActive: product.isActive,
  isFeatured: product.isFeatured,
  stockQuantity: product.stockQuantity,
  availabilityStatus: product.stockQuantity === 0
    ? 'OUT_OF_STOCK'
    : product.stockQuantity <= 5
      ? 'LOW_STOCK'
      : 'IN_STOCK',
  isAvailable: product.isActive && product.stockQuantity > 0,
  isWishlisted,
  createdAt: product.createdAt.toISOString(),
  updatedAt: product.updatedAt.toISOString(),
})

export const toPublicProduct = (product: ProductWithCategory, isWishlisted = false): PublicProduct => {
  return toProduct(product, isWishlisted)
}

interface PopularProductRow {
  id: string
  categoryId: string
  categoryName: string
  categorySlug: string
  name: string
  slug: string
  description: string
  price: Prisma.Decimal
  discountType: Product['discountType']
  discountValue: Prisma.Decimal | null
  discountedPrice: Prisma.Decimal
  deliveryFee: Prisma.Decimal
  unit: string
  image: string
  isActive: boolean
  isFeatured: boolean
  images: string[]
  stockQuantity: number
  createdAt: Date
  updatedAt: Date
  orderedQuantity: bigint
}

const toPopularProduct = (product: PopularProductRow, images: string[], options: ProductOption[]): PublicProduct => ({
  id: product.id,
  categoryId: product.categoryId,
  categoryName: product.categoryName,
  categorySlug: product.categorySlug,
  name: product.name,
  slug: product.slug,
  description: product.description,
  price: product.price.toString(),
  discountType: product.discountType,
  discountValue: product.discountValue?.toString() ?? null,
  discountedPrice: calculateDiscountedPrice(
    product.price,
    product.discountType,
    product.discountValue,
  ).toString(),
  deliveryFee: product.deliveryFee.toString(),
  unit: product.unit,
  image: product.image,
  images,
  options,
  isActive: product.isActive,
  isFeatured: product.isFeatured,
  stockQuantity: product.stockQuantity,
  availabilityStatus: product.stockQuantity === 0
    ? 'OUT_OF_STOCK'
    : product.stockQuantity <= 5
      ? 'LOW_STOCK'
      : 'IN_STOCK',
  isAvailable: product.isActive && product.stockQuantity > 0,
  isWishlisted: false,
  createdAt: product.createdAt.toISOString(),
  updatedAt: product.updatedAt.toISOString(),
})

export async function getProducts(query: PublicProductQuery, wishlistUserId?: string): Promise<PublicProductPage> {
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    category: { isActive: true },
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { category: { name: { contains: query.search, mode: 'insensitive' } } },
            { category: { slug: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  if (query.category) {
    where.category = {
      isActive: true,
      ...(UUID_PATTERN.test(query.category) ? { id: query.category } : { slug: query.category }),
    }
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] = query.sort === 'price_asc'
    ? [{ price: 'asc' }, { createdAt: 'desc' }]
    : query.sort === 'price_desc'
      ? [{ price: 'desc' }, { createdAt: 'desc' }]
      : [{ createdAt: 'desc' }, { id: 'desc' }]

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
       include: productInclude,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ])

  const wishlistProductIds = wishlistUserId
    ? new Set((await prisma.wishlistItem.findMany({
        where: { userId: wishlistUserId, productId: { in: products.map((product) => product.id) } },
        select: { productId: true },
      })).map((item) => item.productId))
    : new Set<string>()

  return {
    products: products.map((product) => toPublicProduct(product, wishlistProductIds.has(product.id))),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  }
}

export async function getCategoryProductSections(
  limit: number,
  wishlistUserId?: string,
): Promise<PublicCategoryProductSection[]> {
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      products: { some: { isActive: true, stockQuantity: { gt: 0 } } },
    },
    include: {
      products: {
        where: { isActive: true, stockQuantity: { gt: 0 } },
         include: {
           category: true,
           images: { orderBy: { sortOrder: 'asc' } },
           options: { orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] },
         },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
      },
    },
    orderBy: { name: 'asc' },
  })

  const products = categories.flatMap((category) => category.products)
  const wishlistProductIds = wishlistUserId
    ? new Set((await prisma.wishlistItem.findMany({
        where: { userId: wishlistUserId, productId: { in: products.map((product) => product.id) } },
        select: { productId: true },
      })).map((item) => item.productId))
    : new Set<string>()

  return categories
    .filter((category) => category.products.length > 0)
    .map((category) => ({
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
      products: category.products.map((product) => toPublicProduct(product, wishlistProductIds.has(product.id))),
    }))
}

export async function getPopularProducts(query: PublicProductQuery, wishlistUserId?: string): Promise<PublicProductPage> {
  const products = await prisma.$queryRaw<PopularProductRow[]>(Prisma.sql`
    SELECT
      p.id,
      p.category_id AS "categoryId",
      c.name AS "categoryName",
      c.slug AS "categorySlug",
      p.name,
      p.slug,
      p.description,
      p.price,
      p.discount_type AS "discountType",
      p.discount_value AS "discountValue",
      p.delivery_fee AS "deliveryFee",
      p.unit,
      p.image,
      p.is_active AS "isActive",
      p.is_featured AS "isFeatured",
      p.stock_quantity AS "stockQuantity",
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt",
      COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.quantity ELSE 0 END), 0)::bigint AS "orderedQuantity"
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    LEFT JOIN order_items oi ON oi.product_id = p.id
    LEFT JOIN orders o
      ON o.id = oi.order_id
      AND o.payment_status = ${PaymentStatus.PAID}::"PaymentStatus"
      AND o.order_status <> ${OrderStatus.CANCELLED}::"OrderStatus"
    WHERE p.is_active = true
      AND c.is_active = true
    GROUP BY
      p.id,
      p.category_id,
      c.name,
      c.slug,
      p.name,
      p.slug,
      p.description,
      p.price,
      p.discount_type,
      p.discount_value,
      p.delivery_fee,
      p.unit,
      p.image,
      p.is_active,
      p.is_featured,
      p.stock_quantity,
      p.created_at,
      p.updated_at
    ORDER BY "orderedQuantity" DESC, p.created_at DESC, p.id DESC
    LIMIT ${query.limit}
    OFFSET ${(query.page - 1) * query.limit}
  `)

  const wishlistProductIds = wishlistUserId
    ? new Set((await prisma.wishlistItem.findMany({
        where: { userId: wishlistUserId, productId: { in: products.map((product) => product.id) } },
        select: { productId: true },
      })).map((item) => item.productId))
    : new Set<string>()
  const imageRows = products.length
    ? await prisma.productImage.findMany({
        where: { productId: { in: products.map((product) => product.id) } },
        orderBy: { sortOrder: 'asc' },
        select: { productId: true, url: true },
      })
    : []
  const imagesByProduct = new Map<string, string[]>()
  for (const image of imageRows) {
    const current = imagesByProduct.get(image.productId) ?? []
    current.push(image.url)
    imagesByProduct.set(image.productId, current)
  }

  const productIds = products.map((product) => product.id)
  const optionRows = productIds.length
    ? await prisma.productOption.findMany({
        where: { productId: { in: productIds }, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      })
    : []
  const optionsByProduct = new Map<string, ProductOption[]>()
  for (const row of optionRows) {
    const current = optionsByProduct.get(row.productId) ?? []
    current.push(toOption(row))
    optionsByProduct.set(row.productId, current)
  }

  return {
    products: products.map((product) => ({
      ...toPopularProduct(product, imagesByProduct.get(product.id) ?? [product.image], optionsByProduct.get(product.id) ?? []),
      isWishlisted: wishlistProductIds.has(product.id),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: products.length,
      totalPages: 1,
    },
  }
}

export async function getNewArrivals(query: PublicProductQuery, wishlistUserId?: string): Promise<PublicProductPage> {
  return getProducts({ ...query, sort: 'newest' }, wishlistUserId)
}

export async function getFeaturedProducts(query: PublicProductQuery, wishlistUserId?: string): Promise<PublicProductPage> {
  const where: Prisma.ProductWhereInput = {
    isFeatured: true,
    isActive: true,
    stockQuantity: { gt: 0 },
    category: { isActive: true },
  }
  const products = await prisma.product.findMany({
    where,
    include: productInclude,
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })
  const wishlistProductIds = wishlistUserId
    ? new Set((await prisma.wishlistItem.findMany({
        where: { userId: wishlistUserId, productId: { in: products.map((product) => product.id) } },
        select: { productId: true },
      })).map((item) => item.productId))
    : new Set<string>()

  return {
    products: products.map((product) => toPublicProduct(product, wishlistProductIds.has(product.id))),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: products.length,
      totalPages: 1,
    },
  }
}

export async function getProductById(identifier: string, wishlistUserId?: string): Promise<PublicProduct | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)
  const product = await prisma.product.findFirst({
    where: isUuid
      ? { isActive: true, category: { isActive: true }, OR: [{ id: identifier }, { slug: identifier }] }
      : { isActive: true, category: { isActive: true }, slug: identifier },
    include: productInclude,
  })

  if (!product) return null
  const isWishlisted = wishlistUserId
    ? Boolean(await prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId: wishlistUserId, productId: product.id } },
        select: { id: true },
      }))
    : false
  return toPublicProduct(product, isWishlisted)
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
        include: productInclude,
      })
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
          ...(replacesOptions
            ? { options: { deleteMany: {}, create: optionCreateRows(input.options) } }
            : {}),
        },
        include: productInclude,
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
    }, { timeout: 15000 })
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
    include: productInclude,
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
    include: productInclude,
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