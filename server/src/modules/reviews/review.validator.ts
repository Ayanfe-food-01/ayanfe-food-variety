import { HttpError } from '../../utils/http.js'
import type {
  AdminReviewsQuery,
  PublicProductReviewsQuery,
  ReviewCreateInput,
} from './review.types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const booleanValue = (value: unknown, field: string, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  throw new HttpError(400, `${field} must be true or false.`)
}

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 20

export function validatePublicProductReviewsQuery(query: Record<string, unknown>): PublicProductReviewsQuery {
  const page = typeof query.page === 'string' ? Number(query.page) : NaN
  const limit = typeof query.limit === 'string' ? Number(query.limit) : NaN

  const resolvedPage = Number.isInteger(page) && page >= 1 ? page : 1
  const resolvedLimit = Number.isInteger(limit) && limit >= 1
    ? Math.min(limit, MAX_LIMIT)
    : DEFAULT_LIMIT

  return { page: resolvedPage, limit: resolvedLimit }
}

export function validateReviewCreateInput(body: unknown): ReviewCreateInput {
  if (!isRecord(body)) throw new HttpError(400, 'Review data is required.')

  const orderItemId = typeof body.orderItemId === 'string' ? body.orderItemId.trim() : ''
  if (!UUID_PATTERN.test(orderItemId)) throw new HttpError(400, 'The order item is invalid.')

  const rating = typeof body.rating === 'number' ? body.rating : Number(body.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'Rating must be a whole number between 1 and 5 stars.')
  }

  const content = typeof body.content === 'string' ? body.content.trim() : ''
  if (!content) throw new HttpError(400, 'Review is required.')
  if (content.length < 10) {
    throw new HttpError(400, 'Review must be at least 10 characters.')
  }
  if (content.length > 2000) {
    throw new HttpError(400, 'Review must be 2000 characters or fewer.')
  }

  return { orderItemId, rating, content }
}

export function validateReviewId(value: string | string[] | undefined): string {
  const id = Array.isArray(value) ? value[0] : value
  if (!id || !UUID_PATTERN.test(id.trim())) throw new HttpError(400, 'Review ID is invalid.')
  return id.trim()
}

export function validateAdminReviewsQuery(query: Record<string, unknown>): AdminReviewsQuery {
  const page = Number(query.page ?? 1)
  const pageSize = Number(query.pageSize ?? 10)
  if (!Number.isInteger(page) || page < 1) throw new HttpError(400, 'Page must be a positive integer.')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new HttpError(400, 'Page size must be between 1 and 50.')
  }

  const status = query.status === 'pending' || query.status === 'approved' || query.status === 'rejected'
    ? query.status
    : undefined
  if (query.status && !status) throw new HttpError(400, 'Review status filter is invalid.')

  const verified = query.verified === 'verified' || query.verified === 'not-verified'
    ? query.verified
    : undefined
  if (query.verified && !verified) throw new HttpError(400, 'Purchase verification filter is invalid.')

  let rating: number | undefined
  if (query.rating !== undefined && query.rating !== '') {
    const parsed = typeof query.rating === 'number' ? query.rating : Number(query.rating)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
      throw new HttpError(400, 'Rating filter must be a whole number between 1 and 5.')
    }
    rating = parsed
  }

  return {
    page,
    pageSize,
    search: typeof query.search === 'string' ? query.search.trim().slice(0, 200) || undefined : undefined,
    status,
    verified,
    rating,
  }
}

export function validateReviewStatusInput(body: unknown): 'APPROVED' | 'REJECTED' {
  if (!isRecord(body)) throw new HttpError(400, 'Review status is required.')
  if (body.status === 'APPROVED') return 'APPROVED'
  if (body.status === 'REJECTED') return 'REJECTED'
  throw new HttpError(400, 'Review status must be APPROVED or REJECTED.')
}

export function validateReviewFeaturedInput(body: unknown): boolean {
  if (!isRecord(body)) throw new HttpError(400, 'Review featured flag is required.')
  return booleanValue(body.isFeatured, 'Featured flag', false)
}

export function validateReviewDisplayOrderInput(body: unknown): number {
  if (!isRecord(body)) throw new HttpError(400, 'Review display order is required.')
  const order = typeof body.displayOrder === 'number' ? body.displayOrder : Number(body.displayOrder)
  if (!Number.isInteger(order) || order < 0 || order > 999999) {
    throw new HttpError(400, 'Display order must be a whole number between 0 and 999999.')
  }
  return order
}

export function validateReviewDeletionInput(body: unknown): void {
  if (!isRecord(body)) throw new HttpError(400, 'Review deletion requires confirmation.')
  if (body.confirm !== true) throw new HttpError(400, 'Review deletion requires confirmation.')
}