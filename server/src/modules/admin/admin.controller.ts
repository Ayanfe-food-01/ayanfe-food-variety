import type { RequestHandler } from 'express'
import { PaymentSubmissionStatus } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import { reviewPayment } from '../payments/payment.service.js'
import { validateReviewPaymentInput, validatePaymentSubmissionId } from '../payments/payment.validator.js'
import {
  getAdminOrder,
  getAdminPayment,
  getAdminPaymentSettings,
  getDashboardStats,
  listAdminOrders,
  listAdminPayments,
  updateAdminOrderStatus,
  updateAdminPaymentSettings,
} from './admin.service.js'
import {
  validateAdminOrdersQuery,
  validateOrderNumber,
  validateOrderStatusInput,
  validatePaymentSettingsInput,
} from './admin.validator.js'

export const getDashboardController: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: { stats: await getDashboardStats() } })
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

const parsePaymentStatus = (value: unknown): PaymentSubmissionStatus | undefined => {
  if (value === undefined) return PaymentSubmissionStatus.PENDING
  if (typeof value !== 'string' || !Object.values(PaymentSubmissionStatus).includes(value as PaymentSubmissionStatus)) {
    throw new HttpError(400, 'Payment status is invalid.')
  }
  return value as PaymentSubmissionStatus
}

export const listAdminPaymentsController: RequestHandler = async (request, response) => {
  response.json({ success: true, data: { payments: await listAdminPayments(parsePaymentStatus(request.query.status)) } })
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
    data: { payment: await reviewPayment(id, true, validateReviewPaymentInput(request.body, false)) },
  })
}

export const rejectAdminPaymentController: RequestHandler = async (request, response) => {
  const id = validatePaymentSubmissionId(request.params.id)
  response.json({
    success: true,
    message: 'Payment rejected.',
    data: { payment: await reviewPayment(id, false, validateReviewPaymentInput(request.body, true)) },
  })
}

export const getAdminPaymentSettingsController: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: { settings: await getAdminPaymentSettings() } })
}

export const updateAdminPaymentSettingsController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Payment settings updated.',
    data: { settings: await updateAdminPaymentSettings(validatePaymentSettingsInput(request.body)) },
  })
}
