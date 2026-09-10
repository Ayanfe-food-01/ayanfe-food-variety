import { HttpError } from '../../utils/http.js'
import { normalizeSearchQuery } from '../../utils/search.js'
import type {
  AdminProductQuery,
  ProductInput,
  PublicProductQuery,
  PublicProductSort,
  AdminProductSort,
} from './product.types.js'
import {
  UUID_PATTERN,
  booleanValue,
  deliveryFeeValue,
  discountFields,
  integerValue,
  isRecord,
  priceValue,
  requiredText,
} from './product.validator.common.js'
import { parseProductOptions } from './product.validator.options.js'

export function validateAdminProductId(value: string | undefined): string {
  if (!value || !UUID_PATTERN.test(value.trim())) throw new HttpError(400, 'Product ID is invalid.')
  return value.trim()
}

export function validateProductFields(body: unknown): Omit<ProductInput, 'image' | 'images'> {
  if (!isRecord(body)) throw new HttpError(400, 'Product data is required.')
  const categoryId = requiredText(body.categoryId, 'Category', 1, 40)
  if (!UUID_PATTERN.test(categoryId)) throw new HttpError(400, 'Category is invalid.')

  const options = parseProductOptions(body.options)
  const hasOptions = Boolean(options && options.length > 0)

  let price: string | undefined
  if (hasOptions) {
    const hasProvidedPrice = body.price !== undefined && body.price !== null && String(body.price).trim() !== ''
    if (hasProvidedPrice) price = priceValue(body.price)
    if (
      (body.discountType !== undefined && body.discountType !== null && body.discountType !== '')
      || (body.discountValue !== undefined && body.discountValue !== null && String(body.discountValue).trim() !== '')
    ) {
      throw new HttpError(400, 'Discounts cannot be combined with product options.')
    }
  } else {
    price = priceValue(body.price)
  }

  return {
    name: requiredText(body.name, 'Product name', 2, 180),
    categoryId,
    price,
    ...(hasOptions ? { discountType: null, discountValue: null } : discountFields(body.discountType, body.discountValue, price!)),
    deliveryFee: deliveryFeeValue(body.deliveryFee),
    unit: requiredText(body.unit, 'Unit', 1, 80),
    description: requiredText(body.description, 'Description', 10, 4000),
    isActive: booleanValue(body.isActive, 'Availability', true),
    isFeatured: booleanValue(body.isFeatured, 'Featured', false),
    stockQuantity: hasOptions ? undefined : integerValue(body.stockQuantity, 'Stock quantity'),
    options,
  }
}

export function validateProductImageOrder(body: unknown): string[] | null {
  if (!isRecord(body) || body.imageOrder === undefined || body.imageOrder === '') return null
  if (typeof body.imageOrder !== 'string') throw new HttpError(400, 'Product image order is invalid.')

  let parsed: unknown
  try {
    parsed = JSON.parse(body.imageOrder)
  } catch {
    throw new HttpError(400, 'Product image order is invalid.')
  }
  if (!Array.isArray(parsed) || parsed.length > 10 || parsed.some((item) => typeof item !== 'string')) {
    throw new HttpError(400, 'Product image order is invalid.')
  }
  return parsed as string[]
}

export function validateProductStatusInput(body: unknown): boolean {
  if (!isRecord(body)) throw new HttpError(400, 'Availability is required.')
  return booleanValue(body.isActive, 'Availability', false)
}

export function validateProductFeaturedInput(body: unknown): boolean {
  if (!isRecord(body)) throw new HttpError(400, 'Featured status is required.')
  return booleanValue(body.isFeatured, 'Featured', false)
}

export function validateAdminProductsQuery(query: Record<string, unknown>): AdminProductQuery {
  const page = Number(query.page ?? 1)
  const pageSize = Number(query.pageSize ?? 10)
  if (!Number.isInteger(page) || page < 1) throw new HttpError(400, 'Page must be a positive integer.')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) throw new HttpError(400, 'Page size must be between 1 and 50.')
  const categoryId = typeof query.categoryId === 'string' && query.categoryId ? query.categoryId : undefined
  if (categoryId && !UUID_PATTERN.test(categoryId)) throw new HttpError(400, 'Category filter is invalid.')
  const categoryIds = typeof query.categoryIds === 'string'
    ? [...new Set(query.categoryIds.split(',').map((value) => value.trim()).filter(Boolean))]
    : undefined
  if (categoryIds?.some((value) => !UUID_PATTERN.test(value))) throw new HttpError(400, 'Category filters are invalid.')
  const availability = query.availability === 'active' || query.availability === 'inactive' || query.availability === 'out-of-stock'
    ? query.availability
    : undefined
  if (query.availability && !availability) throw new HttpError(400, 'Availability filter is invalid.')
  const stockStatus = query.stockStatus === 'in-stock' || query.stockStatus === 'low-stock' || query.stockStatus === 'out-of-stock'
    ? query.stockStatus
    : undefined
  if (query.stockStatus && !stockStatus) throw new HttpError(400, 'Stock status filter is invalid.')
  const featured = query.featured === 'true' ? true : query.featured === 'false' ? false : undefined
  if (query.featured !== undefined && featured === undefined) throw new HttpError(400, 'Featured filter is invalid.')
  const discount = query.discount === 'on-sale' || query.discount === 'no-discount'
    ? query.discount
    : undefined
  if (query.discount && !discount) throw new HttpError(400, 'Discount filter is invalid.')
  const productType = query.productType === 'simple' || query.productType === 'with-options'
    ? query.productType
    : undefined
  if (query.productType && !productType) throw new HttpError(400, 'Product type filter is invalid.')
  const wholesale = query.wholesale === 'enabled' || query.wholesale === 'not-configured'
    ? query.wholesale
    : undefined
  if (query.wholesale && !wholesale) throw new HttpError(400, 'Wholesale filter is invalid.')
  const parsePrice = (key: string): number | undefined => {
    if (query[key] === undefined || query[key] === '') return undefined
    const value = Number(query[key])
    if (!Number.isFinite(value) || value < 0) throw new HttpError(400, `${key} must be a non-negative number.`)
    return value
  }
  const minPrice = parsePrice('minPrice')
  const maxPrice = parsePrice('maxPrice')
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new HttpError(400, 'Minimum price cannot exceed maximum price.')
  }
  const sortValues: AdminProductSort[] = ['newest', 'oldest', 'updated', 'price_asc', 'price_desc', 'stock_asc', 'stock_desc']
  const sort = typeof query.sort === 'string' && sortValues.includes(query.sort as AdminProductSort)
    ? query.sort as AdminProductSort
    : query.sort === undefined
      ? 'newest'
      : undefined
  if (!sort) throw new HttpError(400, 'Product sort is invalid.')
  return {
    page,
    pageSize,
    search: normalizeSearchQuery(query.search, 120),
    categoryId,
    categoryIds: categoryIds?.length ? categoryIds : undefined,
    availability,
    stockStatus,
    featured,
    discount,
    productType,
    wholesale,
    minPrice,
    maxPrice,
    sort,
  }
}

export function validatePublicProductsQuery(query: Record<string, unknown>): PublicProductQuery {
  const page = Number(query.page ?? 1)
  const limit = Number(query.limit ?? 20)
  if (!Number.isInteger(page) || page < 1) throw new HttpError(400, 'Page must be a positive integer.')
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new HttpError(400, 'Limit must be between 1 and 50.')

  const sortValues: PublicProductSort[] = ['relevance', 'price_asc', 'price_desc', 'newest']
  const sort = typeof query.sort === 'string' && sortValues.includes(query.sort as PublicProductSort)
    ? query.sort as PublicProductSort
    : query.sort === undefined
      ? 'relevance'
      : undefined
  if (!sort) throw new HttpError(400, 'Sort must be one of relevance, price_asc, price_desc, or newest.')

  const search = normalizeSearchQuery(query.search, 120)
  if (query.search !== undefined && typeof query.search !== 'string') throw new HttpError(400, 'Search must be text.')

  const category = typeof query.category === 'string' ? query.category.trim() || undefined : undefined
  if (query.category !== undefined && typeof query.category !== 'string') throw new HttpError(400, 'Category must be text.')
  if (category && category.length > 120) throw new HttpError(400, 'Category is too long.')

  return { page, limit, sort, search, category }
}

export function validateCategorySectionsQuery(query: Record<string, unknown>): number {
  const limit = Number(query.limit ?? 6)
  if (!Number.isInteger(limit) || limit < 4 || limit > 6) {
    throw new HttpError(400, 'Category section limit must be between 4 and 6.')
  }
  return limit
}

export function requireProductIdentifier(value: string | undefined): string {
  const identifier = value?.trim() ?? ''
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)
  const isSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(identifier)

  if (!identifier || identifier.length > 180 || (!isUuid && !isSlug)) {
    throw new HttpError(400, 'product id is required')
  }

  return identifier
}