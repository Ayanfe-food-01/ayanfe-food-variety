import { QuoteRequestStatus } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import type { QuoteRequestQuery, RejectQuoteRequestInput } from './quote.types.js'
import { isRecord, optionalText } from './quote.validator.common.js'

export { validatePrepareQuotePricingInput } from './quote.validator.prepare.js'
export { validateCreateQuoteRequestInput } from './quote.validator.create.js'

const QUOTE_NUMBER_PATTERN = /^QR-\d{4}-\d{6}$/

const parseEnum = <T extends string>(value: unknown, values: readonly T[], field: string): T | undefined => {
  if (value === undefined || value === '' || value === 'ALL') return undefined
  if (typeof value !== 'string' || !values.includes(value as T)) throw new HttpError(400, `${field} is invalid.`)
  return value as T
}

export function validateQuoteNumber(value: unknown): string {
  if (typeof value !== 'string' || !QUOTE_NUMBER_PATTERN.test(value.trim())) {
    throw new HttpError(400, 'Quote reference must be valid.')
  }
  return value.trim()
}

export function validateQuoteRequestQuery(query: Record<string, unknown>): QuoteRequestQuery {
  const page = Number(query.page ?? 1)
  const pageSize = Number(query.pageSize ?? 20)
  if (!Number.isInteger(page) || page < 1) throw new HttpError(400, 'Page must be a positive integer.')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new HttpError(400, 'Page size must be between 1 and 50.')
  }

  return {
    search: typeof query.search === 'string' ? query.search.trim().slice(0, 120) || undefined : undefined,
    status: parseEnum(query.status, Object.values(QuoteRequestStatus), 'Quote status'),
    sort: query.sort === 'oldest' ? 'oldest' : 'newest',
    page,
    pageSize,
  }
}

export function validateQuoteRequestStatusInput(body: unknown): QuoteRequestStatus {
  if (!isRecord(body) || typeof body.status !== 'string') {
    throw new HttpError(400, 'status is required.')
  }
  if (!Object.values(QuoteRequestStatus).includes(body.status as QuoteRequestStatus)) {
    throw new HttpError(400, 'status is invalid.')
  }
  return body.status as QuoteRequestStatus
}

export function validateQuoteRequestNoteInput(body: unknown): string {
  if (!isRecord(body) || typeof body.note !== 'string') {
    throw new HttpError(400, 'note is required.')
  }
  const note = body.note.trim()
  if (note.length > 2000) {
    throw new HttpError(400, 'Internal note must be 2,000 characters or fewer.')
  }
  return note
}

export function validateRejectQuoteRequestInput(body: unknown): RejectQuoteRequestInput {
  const reason = optionalText(body === null || body === undefined || typeof body !== 'object' ? {} : (body as Record<string, unknown>).reason, 'reason', 500)
  return { reason }
}