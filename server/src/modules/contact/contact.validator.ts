import { type ContactMessageStatus } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import { normalizeSearchQuery } from '../../utils/search.js'
import type {
  AdminContactMessageQuery,
  CreateContactMessageInput,
} from './contact.types.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const MAX_NAME_LENGTH = 180
const MAX_SUBJECT_LENGTH = 180
const MAX_MESSAGE_LENGTH = 2000

const validateRequestKey = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 64) {
    throw new HttpError(400, 'A valid request key is required.')
  }
  return value.trim()
}

export const validContactEmail = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, 'Email is required.')
  }
  const email = value.trim().toLowerCase()
  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'A valid email address is required.')
  }
  return email
}

/**
 * Validates and normalizes the public contact form payload. Name and message
 * are required; subject is capped in length.
 */
export function validateCreateContactMessageInput(body: unknown): CreateContactMessageInput {
  if (!isRecord(body)) throw new HttpError(400, 'Contact message details are required.')

  const subject =
    body.subject === undefined || body.subject === null || body.subject === ''
      ? ''
      : typeof body.subject === 'string'
        ? body.subject.trim().slice(0, MAX_SUBJECT_LENGTH)
        : (() => { throw new HttpError(400, 'Subject must be text.') })()

  const name =
    typeof body.name === 'string' && body.name.trim().length > 0
      ? body.name.trim().slice(0, MAX_NAME_LENGTH)
      : (() => { throw new HttpError(400, 'Name is required.') })()

  const message =
    typeof body.message === 'string' && body.message.trim().length > 0
      ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH)
      : (() => { throw new HttpError(400, 'Message is required.') })()

  return {
    requestKey: validateRequestKey(body.requestKey),
    name,
    email: validContactEmail(body.email),
    subject,
    message,
  }
}

export function validContactStatus(value: unknown): ContactMessageStatus {
  if (value !== 'NEW' && value !== 'RESOLVED') {
    throw new HttpError(400, 'Status must be NEW or RESOLVED.')
  }
  return value
}

export function validContactMessageId(value: string | string[] | undefined): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 64) {
    throw new HttpError(400, 'Contact message id is invalid.')
  }
  return value.trim()
}

export function validateAdminContactMessageQuery(query: Record<string, unknown>): AdminContactMessageQuery {
  const page = Number(query.page ?? 1)
  const pageSize = Number(query.pageSize ?? 20)
  if (!Number.isInteger(page) || page < 1) throw new HttpError(400, 'Page must be a positive integer.')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new HttpError(400, 'Page size must be between 1 and 50.')
  }

  const rawStatus = typeof query.status === 'string' && query.status !== '' ? query.status : undefined
  return {
    search: normalizeSearchQuery(query.search, 120),
    status: rawStatus === 'NEW' || rawStatus === 'RESOLVED' ? rawStatus : undefined,
    sort: query.sort === 'oldest' ? 'oldest' : 'newest',
    page,
    pageSize,
  }
}