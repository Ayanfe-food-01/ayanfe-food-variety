import type { RequestHandler } from 'express'
import { PaymentMethod, PaymentSubmissionStatus } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import { reviewPayment } from '../payments/payment.service.js'
import { validateReviewPaymentInput, validatePaymentSubmissionId } from '../payments/payment.validator.js'
import {
  getAdminOrder,
  getAdminPayment,
  getAdminAnalytics,
  getDashboardStats,
  archiveAdminOrder,
  deleteAdminOrder,
  listAdminOrders,
  listAdminPayments,
  restoreAdminOrder,
  updateAdminOrderStatus,
} from './admin.service.js'
import {
  validateAdminOrdersQuery,
  validateOrderNumber,
  validateOrderStatusInput,
} from './admin.validator.js'
import type { AdminPaymentsQuery, AnalyticsRange } from './admin.types.js'

export const getDashboardController: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: { stats: await getDashboardStats() } })
}

export const getAnalyticsController: RequestHandler = async (request, response) => {
  const range = request.query.range
  if (range !== undefined && range !== 'today' && range !== 'week' && range !== 'month' && range !== 'year') {
    throw new HttpError(400, 'Analytics range is invalid.')
  }
  response.json({
    success: true,
    data: { analytics: await getAdminAnalytics((range ?? 'month') as AnalyticsRange) },
  })
}

export const listAdminOrdersController: RequestHandler = async (request, response) => {
  response.json({ success: true, data: await listAdminOrders(validateAdminOrdersQuery(request.query as Record<string, unknown>)) })
}

export const getAdminOrderController: RequestHandler = async (request, response) => {
  const orderNumber = validateOrderNumber(request.params.orderNumber)
  response.json({ success: true, data: { order: await getAdminOrder(orderNumber) } })
}

export const updateAdminOrderStatusController: RequestHandler = async (request, response) => {
  const orderNumber = validateOrderNumber(request.params.orderNumber)
  response.json({
    success: true,
    message: 'Order status updated.',
    data: { order: await updateAdminOrderStatus(orderNumber, validateOrderStatusInput(request.body), request.authenticatedUser!.id) },
  })
}

export const archiveAdminOrderController: RequestHandler = async (request, response) => {
  const orderNumber = validateOrderNumber(request.params.orderNumber)
  response.json({
    success: true,
    message: 'Order archived.',
    data: { order: await archiveAdminOrder(orderNumber, request.authenticatedUser!.id) },
  })
}

export const restoreAdminOrderController: RequestHandler = async (request, response) => {
  const orderNumber = validateOrderNumber(request.params.orderNumber)
  response.json({
    success: true,
    message: 'Order restored.',
    data: { order: await restoreAdminOrder(orderNumber) },
  })
}

export const deleteAdminOrderController: RequestHandler = async (request, response) => {
  const orderNumber = validateOrderNumber(request.params.orderNumber)
  await deleteAdminOrder(orderNumber)
  response.json({ success: true, message: 'Order permanently deleted.' })
}

const parsePaymentStatus = (value: unknown): PaymentSubmissionStatus | undefined => {
  if (value === undefined || value === '' || value === 'ALL') return undefined
  if (typeof value !== 'string' || !Object.values(PaymentSubmissionStatus).includes(value as PaymentSubmissionStatus)) {
    throw new HttpError(400, 'Payment status is invalid.')
  }
  return value as PaymentSubmissionStatus
}

const parsePaymentQuery = (query: Record<string, unknown>): AdminPaymentsQuery => {
  const page = Number(query.page ?? 1)
  const pageSize = Number(query.pageSize ?? 20)
  if (!Number.isInteger(page) || page < 1) throw new HttpError(400, 'Page must be a positive integer.')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) throw new HttpError(400, 'Page size must be between 1 and 50.')

  const parseDate = (value: unknown, field: string, endOfDay = false): Date | undefined => {
    if (value === undefined || value === '') return undefined
    if (typeof value !== 'string') throw new HttpError(400, `${field} is invalid.`)
    const date = new Date(endOfDay ? `${value}T23:59:59.999Z` : value)
    if (Number.isNaN(date.getTime())) throw new HttpError(400, `${field} is invalid.`)
    return date
  }

  const from = parseDate(query.from, 'Start date')
  const to = parseDate(query.to, 'End date', true)
  if (from && to && from > to) throw new HttpError(400, 'Start date cannot be after end date.')
  const paymentMethod = query.paymentMethod === undefined || query.paymentMethod === '' || query.paymentMethod === 'ALL'
    ? undefined
    : query.paymentMethod
  if (paymentMethod !== undefined && (typeof paymentMethod !== 'string' || !Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod))) {
    throw new HttpError(400, 'Payment method is invalid.')
  }

  return {
    search: typeof query.search === 'string' ? query.search.trim().slice(0, 120) || undefined : undefined,
    status: parsePaymentStatus(query.status),
    paymentMethod: paymentMethod as PaymentMethod | undefined,
    from,
    to,
    sort: query.sort === 'oldest' ? 'oldest' : 'newest',
    page,
    pageSize,
  }
}

export const listAdminPaymentsController: RequestHandler = async (request, response) => {
  response.json({ success: true, data: await listAdminPayments(parsePaymentQuery(request.query as Record<string, unknown>)) })
}

export const getAdminPaymentController: RequestHandler = async (request, response) => {
  const id = validatePaymentSubmissionId(request.params.id)
  response.json({ success: true, data: { payment: await getAdminPayment(id) } })
}

export const verifyAdminPaymentController: RequestHandler = async (request, response) => {
  const id = validatePaymentSubmissionId(request.params.id)
  response.json({
    success: true,
    message: 'Payment verified.',
    data: { payment: await reviewPayment(id, true, validateReviewPaymentInput(request.body, false), request.authenticatedUser!.id) },
  })
}

export const rejectAdminPaymentController: RequestHandler = async (request, response) => {
  const id = validatePaymentSubmissionId(request.params.id)
  response.json({
    success: true,
    message: 'Payment rejected.',
    data: { payment: await reviewPayment(id, false, validateReviewPaymentInput(request.body, true), request.authenticatedUser!.id) },
  })
}
