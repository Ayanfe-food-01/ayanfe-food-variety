import { OrderStatus, PaymentStatus } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import type { AdminOrdersQuery, UpdateOrderStatusInput, UpdatePaymentSettingsInput } from './admin.types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const requiredText = (value: unknown, field: string, maxLength: number): string => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new HttpError(400, `${field} is required and must be valid.`)
  }
  return value.trim()
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const validateOrderNumber = (value: unknown): string => {
  if (typeof value !== 'string' || !/^AFV-\d{4}-\d{6}$/.test(value.trim())) {
    throw new HttpError(400, 'Order number must be valid.')
  }
  return value.trim()
}

export function validateOrderStatusInput(body: unknown): UpdateOrderStatusInput {
  if (!isRecord(body) || typeof body.orderStatus !== 'string') {
    throw new HttpError(400, 'orderStatus is required.')
  }
  if (!Object.values(OrderStatus).includes(body.orderStatus as OrderStatus)) {
    throw new HttpError(400, 'orderStatus is invalid.')
  }
  if (body.note !== undefined && (typeof body.note !== 'string' || body.note.trim().length > 1000)) {
    throw new HttpError(400, 'Status note must be 1,000 characters or fewer.')
  }
  return {
    orderStatus: body.orderStatus as OrderStatus,
    note: typeof body.note === 'string' && body.note.trim() ? body.note.trim() : undefined,
  }
}

const parseEnum = <T extends string>(value: unknown, values: readonly T[], field: string): T | undefined => {
  if (value === undefined || value === '') return undefined
  if (typeof value !== 'string' || !values.includes(value as T)) throw new HttpError(400, `${field} is invalid.`)
  return value as T
}

export function validateAdminOrdersQuery(query: Record<string, unknown>): AdminOrdersQuery {
  const page = Number(query.page ?? 1)
  const pageSize = Number(query.pageSize ?? 20)
  if (!Number.isInteger(page) || page < 1) throw new HttpError(400, 'Page must be a positive integer.')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) throw new HttpError(400, 'Page size must be between 1 and 50.')
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 120) : undefined
  return {
    search: search || undefined,
    paymentStatus: parseEnum(query.paymentStatus, Object.values(PaymentStatus), 'Payment status'),
    orderStatus: parseEnum(query.orderStatus, Object.values(OrderStatus), 'Order status'),
    sort: query.sort === 'oldest' ? 'oldest' : 'newest',
    page,
    pageSize,
  }
}

export function validatePaymentSettingsInput(body: unknown): UpdatePaymentSettingsInput {
  if (!isRecord(body)) throw new HttpError(400, 'Payment settings are required.')
  return {
    bankName: requiredText(body.bankName, 'Bank name', 180),
    accountName: requiredText(body.accountName, 'Account name', 180),
    accountNumber: requiredText(body.accountNumber, 'Account number', 80),
    instructions: requiredText(body.instructions, 'Payment instructions', 2000),
  }
}