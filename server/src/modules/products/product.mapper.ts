import { Prisma, ReviewStatus } from '@prisma/client'
import { calculateDiscountedPrice } from './product.pricing.js'
import { computeStockStatus, resolveLowStockThreshold } from '../inventory/inventory.threshold.js'
import type { Product, ProductOption } from './product.types.js'

export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: {
    category: true
    images: { orderBy: { sortOrder: 'asc' } }
    options: { orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] }
  }
}>

export type ProductWithRatings = ProductWithCategory & {
  reviews?: ReadonlyArray<{ rating: number }>
}

export type ProductOptionRow = ProductWithCategory['options'][number]

export const productInclude = {
  category: true,
  images: { orderBy: { sortOrder: 'asc' } },
  options: { orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] },
  reviews: {
    where: { status: ReviewStatus.APPROVED },
    select: { rating: true },
  },
} satisfies Prisma.ProductInclude

export const normalizedImages = (product: Pick<ProductWithCategory, 'image' | 'images'>): string[] => {
  const storedImages = product.images.map((image) => image.url).filter(Boolean)
  const primaryImage = product.image || storedImages[0] || ''
  return primaryImage
    ? [primaryImage, ...storedImages.filter((image) => image !== primaryImage)]
    : storedImages
}

export const toOption = (option: ProductOptionRow): ProductOption => ({
  id: option.id,
  label: option.label,
  price: option.price.toString(),
  stockQuantity: option.stockQuantity,
  lowStockThreshold: option.lowStockThreshold ?? undefined,
  sortOrder: option.sortOrder,
  isActive: option.isActive,
})

export const normalizedOptions = (options: readonly ProductOptionRow[]): ProductOption[] =>
  options.filter((option) => option.isActive).map(toOption)

export const ratingsSummary = (reviews: readonly { rating: number }[]) => {
  const count = reviews.length
  if (count === 0) return { averageRating: null as number | null, reviewCount: 0 }
  const total = reviews.reduce((sum, review) => sum + review.rating, 0)
  return { averageRating: Math.round((total / count) * 10) / 10, reviewCount: count }
}

export const toProduct = (product: ProductWithRatings, isWishlisted = false, wholesaleFrom?: string | null): Product => {
  const threshold = product.lowStockThreshold ?? 5
  return {
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
    unit: product.unit,
    image: product.image,
    images: normalizedImages(product),
    options: normalizedOptions(product.options),
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: threshold,
    availabilityStatus: computeStockStatus(product.stockQuantity, threshold),
    isAvailable: product.isActive && product.stockQuantity > 0,
    isWishlisted,
    wholesaleFrom: wholesaleFrom ?? undefined,
    averageRating: ratingsSummary(product.reviews ?? []).averageRating,
    reviewCount: ratingsSummary(product.reviews ?? []).reviewCount,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  }
}