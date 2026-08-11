import { Prisma } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import type { ReviewPaymentInput, SubmitPaymentInput } from './payment.types.js'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const requiredString = (value: unknown, field: string, maxLength: number): string => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new HttpError(400, `${field} is required and must be valid.`)
  }
  return value.trim()
}

export const validateOrderId = (value: unknown): string => {
  const orderId = requiredString(value, 'Order ID', 36)
  if (!uuidPattern.test(orderId)) throw new HttpError(400, 'Order ID is invalid.')
  return orderId
}

export const validateSubmitPaymentInput = (body: unknown): SubmitPaymentInput => {
  if (!body || typeof body !== 'object') throw new HttpError(400, 'Payment details are required.')
  const input = body as Record<string, unknown>
  const orderId = validateOrderId(input.orderId)
  const senderName = requiredString(input.senderName, 'Sender name', 180)
  const transactionReference = requiredString(input.transactionReference, 'Transaction reference', 180)
  const amount = requiredString(input.amount, 'Amount', 30)
  const transferredAt = requiredString(input.transferredAt, 'Transfer date', 80)

  try {
    const parsedAmount = new Prisma.Decimal(amount)
    if (!parsedAmount.isFinite() || parsedAmount.lte(0)) throw new Error()
  } catch {
    throw new HttpError(400, 'Amount must be a positive number.')
  }

  const parsedDate = new Date(transferredAt)
  if (Number.isNaN(parsedDate.getTime())) throw new HttpError(400, 'Transfer date is invalid.')
  if (parsedDate.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new HttpError(400, 'Transfer date cannot be in the future.')
  }

  return { orderId, senderName, transactionReference, amount, transferredAt }
}

export const validatePaymentSubmissionId = (value: unknown): string => {
  return validateOrderId(value)
}

export const validateReviewPaymentInput = (
  body: unknown,
  isRejection: boolean,
): ReviewPaymentInput => {
  if (!body || typeof body !== 'object') {
    if (isRejection) throw new HttpError(400, 'A review note is required when rejecting a payment.')
    return {}
  }
  const value = (body as Record<string, unknown>).reviewNote
  if (value === undefined || value === null || value === '') {
    if (isRejection) throw new HttpError(400, 'A review note is required when rejecting a payment.')
    return {}
  }
  return { reviewNote: requiredString(value, 'Review note', 1000) }
}