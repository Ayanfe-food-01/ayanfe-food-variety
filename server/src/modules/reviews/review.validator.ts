import { HttpError } from '../../utils/http.js'
import type { ReviewCreateInput } from './review.types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

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