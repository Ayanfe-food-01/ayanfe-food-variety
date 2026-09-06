import { FulfillmentMethod, QuoteRequestStatus } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import type {
  CreateQuoteRequestInput,
  PrepareQuotePricingInput,
  QuoteRequestQuery,
  RejectQuoteRequestInput,
} from './quote.types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const QUOTE_NUMBER_PATTERN = /^QR-\d{4}-\d{6}$/
const MAX_ITEMS = 50
const MAX_QUANTITY = 100000
const MAX_MESSAGE_LENGTH = 2000
const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/
const MAX_UNIT_PRICE = 10_000_000
const MAX_DELIVERY_FEE = 10_000_000

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const requiredText = (value: unknown, field: string, maxLength: number): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, `${field} is required.`)
  }

  const normalizedValue = value.trim()
  if (normalizedValue.length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer.`)
  }

  return normalizedValue
}

const optionalText = (value: unknown, field: string, maxLength: number): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} must be text.`)
  }

  const normalizedValue = value.trim()
  if (normalizedValue.length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer.`)
  }

  return normalizedValue || undefined
}

const requiredEmail = (value: unknown): string => {
  const email = requiredText(value, 'email', 255).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'A valid email address is required.')
  }
  return email
}

const requiredPhone = (value: unknown): string => {
  const phone = requiredText(value, 'phone number', 40)
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) {
    throw new HttpError(400, 'Enter a valid phone number.')
  }
  return phone
}

const validateRequestKey = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 64) {
    throw new HttpError(400, 'A valid request key is required.')
  }
  return value.trim()
}

const validateItems = (value: unknown): CreateQuoteRequestInput['items'] => {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ITEMS) {
    throw new HttpError(400, 'Add at least one product to your request.')
  }

  const seenKeys = new Set<string>()
  return value.map((item) => {
    if (!isRecord(item) || typeof item.productId !== 'string' || !UUID_PATTERN.test(item.productId.trim())) {
      throw new HttpError(400, 'One or more requested products are invalid.')
    }

    if (
      typeof item.quantity !== 'number'
      || !Number.isInteger(item.quantity)
      || item.quantity < 1
      || item.quantity > MAX_QUANTITY
    ) {
      throw new HttpError(400, 'Requested quantities must be positive whole numbers.')
    }

    let productOptionId: string | null = null
    if (item.productOptionId !== undefined && item.productOptionId !== null && item.productOptionId !== '') {
      if (typeof item.productOptionId !== 'string' || !UUID_PATTERN.test(item.productOptionId.trim())) {
        throw new HttpError(400, 'One or more requested product options are invalid.')
      }
      productOptionId = item.productOptionId.trim()
    }

    const dedupKey = `${item.productId.trim()}|${productOptionId ?? ''}`
    if (seenKeys.has(dedupKey)) {
      throw new HttpError(400, 'Each product may only appear once in a single request.')
    }
    seenKeys.add(dedupKey)

    const note = optionalText(item.note, 'item note', 500)

    return {
      productId: item.productId.trim(),
      productOptionId,
      quantity: item.quantity as number,
      note,
    }
  })
}

const parseMoney = (value: unknown, field: string, max: number, options: { allowZero: boolean }): string => {
  const raw = typeof value === 'number'
    ? (Number.isFinite(value) ? String(value) : '')
    : typeof value === 'string' ? value.trim() : ''
  if (!MONEY_PATTERN.test(raw)) {
    throw new HttpError(400, `${field} must be a valid amount with at most two decimal places.`)
  }

  const amount = Number(raw)
  if (options.allowZero && amount === 0) return '0.00'
  if (!(amount > 0)) {
    throw new HttpError(400, `${field} must be greater than 0.`)
  }
  if (amount > max) {
    throw new HttpError(400, `${field} is too large.`)
  }
  return amount.toFixed(2)
}

export function validatePrepareQuotePricingInput(body: unknown): PrepareQuotePricingInput {
  if (!isRecord(body)) throw new HttpError(400, 'Quotation prices are required.')

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_ITEMS) {
    throw new HttpError(400, 'Provide a quoted price for every requested item.')
  }

  const seenItemIds = new Set<string>()
  const items = body.items.map((entry) => {
    if (!isRecord(entry) || typeof entry.itemId !== 'string' || !UUID_PATTERN.test(entry.itemId.trim())) {
      throw new HttpError(400, 'One or more quoted items are invalid.')
    }
    const itemId = entry.itemId.trim()
    if (seenItemIds.has(itemId)) {
      throw new HttpError(400, 'Each requested item may only be priced once.')
    }
    seenItemIds.add(itemId)

    return {
      itemId,
      quotedUnitPrice: parseMoney(entry.quotedUnitPrice, 'Quoted unit price', MAX_UNIT_PRICE, { allowZero: false }),
    }
  })

  const rawDeliveryFee = body.deliveryFee
  const deliveryFee = rawDeliveryFee === undefined || rawDeliveryFee === null || rawDeliveryFee === ''
    ? '0.00'
    : parseMoney(rawDeliveryFee, 'Delivery fee', MAX_DELIVERY_FEE, { allowZero: true })

  const fulfillmentMethod = body.fulfillmentMethod
  if (fulfillmentMethod !== FulfillmentMethod.PICKUP && fulfillmentMethod !== FulfillmentMethod.DELIVERY) {
    throw new HttpError(400, 'A valid fulfillment method is required.')
  }

  return { items, deliveryFee, fulfillmentMethod }
}

export function validateCreateQuoteRequestInput(body: unknown): CreateQuoteRequestInput {
  if (!isRecord(body)) throw new HttpError(400, 'Quote request details are required.')

  return {
    requestKey: validateRequestKey(body.requestKey),
    customerName: requiredText(body.customerName, 'Full name', 180),
    customerEmail: requiredEmail(body.customerEmail),
    customerPhone: requiredPhone(body.customerPhone),
    message: optionalText(body.message, 'message', MAX_MESSAGE_LENGTH),
    items: validateItems(body.items),
  }
}

export function validateQuoteNumber(value: unknown): string {
  if (typeof value !== 'string' || !QUOTE_NUMBER_PATTERN.test(value.trim())) {
    throw new HttpError(400, 'Quote reference must be valid.')
  }
  return value.trim()
}

const parseEnum = <T extends string>(value: unknown, values: readonly T[], field: string): T | undefined => {
  if (value === undefined || value === '' || value === 'ALL') return undefined
  if (typeof value !== 'string' || !values.includes(value as T)) throw new HttpError(400, `${field} is invalid.`)
  return value as T
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