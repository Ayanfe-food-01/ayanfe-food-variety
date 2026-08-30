import type { RequestHandler } from 'express'
import {
  acceptQuoteRequest,
  getCustomerQuoteRequest,
  listCustomerQuoteRequests,
  rejectQuoteRequest,
} from './quote.service.js'
import {
  validateQuoteNumber,
  validateRejectQuoteRequestInput,
} from './quote.validator.js'
import { convertQuoteRequestToOrder } from '../orders/order.service.js'
import { validateConvertQuoteInput } from '../orders/order.validator.js'

export const listCustomerQuoteRequestsController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: await listCustomerQuoteRequests(request.authenticatedUser!.id),
  })
}

export const getCustomerQuoteRequestController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: {
      quoteRequest: await getCustomerQuoteRequest(
        validateQuoteNumber(request.params.reference),
        request.authenticatedUser!.id,
      ),
    },
  })
}

export const acceptCustomerQuoteRequestController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Quotation accepted. Thank you!',
    data: {
      quoteRequest: await acceptQuoteRequest(validateQuoteNumber(request.params.reference), request.authenticatedUser!.id),
    },
  })
}

export const rejectCustomerQuoteRequestController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Quotation declined.',
    data: {
      quoteRequest: await rejectQuoteRequest(
        validateQuoteNumber(request.params.reference),
        request.authenticatedUser!.id,
        validateRejectQuoteRequestInput(request.body),
      ),
    },
  })
}

export const convertCustomerQuoteRequestController: RequestHandler = async (request, response) => {
  const { order, created } = await convertQuoteRequestToOrder(
    request.authenticatedUser!.id,
    validateQuoteNumber(request.params.reference),
    validateConvertQuoteInput(request.body),
  )
  response.status(created ? 201 : 200).json({
    success: true,
    message: created
      ? 'Quotation converted to an order.'
      : 'This quotation was already converted to an order.',
    data: { order },
  })
}