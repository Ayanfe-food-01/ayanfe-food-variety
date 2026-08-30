import { HttpError } from '../../utils/http.js'
import type { AdminTestimonialQuery, TestimonialInput } from './testimonial.types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const requiredText = (value: unknown, field: string, maxLength: number): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${field} is required.`)
  }
  const trimmed = value.trim()
  if (trimmed.length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer.`)
  }
  return trimmed
}

const booleanValue = (value: unknown, field: string, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  throw new HttpError(400, `${field} must be true or false.`)
}

const ratingValue = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null
  const rating = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'Rating must be a whole number between 1 and 5.')
  }
  return rating
}

const displayOrderValue = (value: unknown): number => {
  if (value === undefined || value === '') return 0
  const order = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(order) || order < 0 || order > 999999) {
    throw new HttpError(400, 'Display order must be a whole number between 0 and 999999.')
  }
  return order
}

export function validateTestimonialInput(body: unknown): TestimonialInput {
  if (!isRecord(body)) throw new HttpError(400, 'Testimonial data is required.')
  return {
    authorName: requiredText(body.authorName, 'Author name', 180),
    content: requiredText(body.content, 'Testimonial', 2000),
    rating: ratingValue(body.rating),
    isActive: booleanValue(body.isActive, 'Testimonial status', true),
    isFeatured: booleanValue(body.isFeatured, 'Featured flag', false),
    displayOrder: displayOrderValue(body.displayOrder),
  }
}

export function validateTestimonialId(value: string | string[] | undefined): string {
  const id = Array.isArray(value) ? value[0] : value
  if (!id || !UUID_PATTERN.test(id.trim())) throw new HttpError(400, 'Testimonial ID is invalid.')
  return id.trim()
}

export function validateTestimonialStatusInput(body: unknown): boolean {
  if (!isRecord(body)) throw new HttpError(400, 'Testimonial status is required.')
  return booleanValue(body.isActive, 'Testimonial status', false)
}

export function validateTestimonialFeaturedInput(body: unknown): boolean {
  if (!isRecord(body)) throw new HttpError(400, 'Testimonial featured flag is required.')
  return booleanValue(body.isFeatured, 'Featured flag', false)
}

export function validateAdminTestimonialsQuery(query: Record<string, unknown>): AdminTestimonialQuery {
  const page = Number(query.page ?? 1)
  const pageSize = Number(query.pageSize ?? 10)
  if (!Number.isInteger(page) || page < 1) throw new HttpError(400, 'Page must be a positive integer.')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new HttpError(400, 'Page size must be between 1 and 50.')
  }

  const status = query.status === 'active' || query.status === 'inactive' ? query.status : undefined
  if (query.status && !status) throw new HttpError(400, 'Testimonial status filter is invalid.')

  const featured = query.featured === 'featured' || query.featured === 'not-featured' ? query.featured : undefined
  if (query.featured && !featured) throw new HttpError(400, 'Testimonial featured filter is invalid.')

  return {
    page,
    pageSize,
    search: typeof query.search === 'string' ? query.search.trim().slice(0, 200) || undefined : undefined,
    status,
    featured,
  }
}