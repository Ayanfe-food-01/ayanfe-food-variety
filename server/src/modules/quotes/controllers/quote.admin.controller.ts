import type { RequestHandler } from 'express'
import {
  getAdminQuoteRequest,
  listAdminQuoteRequests,
  prepareQuotePricing,
  reviseQuotePricing,
  updateAdminQuoteRequestNote,
  updateAdminQuoteRequestStatus,
} from '../services/admin-quote.service.js'
import {
  validatePrepareQuotePricingInput,
  validateQuoteNumber,
  validateQuoteRequestNoteInput,
  validateQuoteRequestQuery,
  validateQuoteRequestStatusInput,
} from '../validators/quote.validator.js'

export const listAdminQuoteRequestsController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: await listAdminQuoteRequests(validateQuoteRequestQuery(request.query as Record<string, unknown>)),
  })
}

export const getAdminQuoteRequestController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: { quoteRequest: await getAdminQuoteRequest(validateQuoteNumber(request.params.reference)) },
  })
}

export const updateAdminQuoteRequestStatusController: RequestHandler = async (request, response) => {
  const reference = validateQuoteNumber(request.params.reference)
  const { status, reason } = validateQuoteRequestStatusInput(request.body)
  response.json({
    success: true,
    message: 'Quote status updated.',
    data: { quoteRequest: await updateAdminQuoteRequestStatus(reference, status, reason) },
  })
}

export const reviseAdminQuoteRequestController: RequestHandler = async (request, response) => {
  const reference = validateQuoteNumber(request.params.reference)
  response.json({
    success: true,
    message: 'Quotation revised. The request was returned to the contacted stage.',
    data: { quoteRequest: await reviseQuotePricing(reference) },
  })
}

export const updateAdminQuoteRequestNoteController: RequestHandler = async (request, response) => {
  const reference = validateQuoteNumber(request.params.reference)
  response.json({
    success: true,
    message: 'Internal note saved.',
    data: { quoteRequest: await updateAdminQuoteRequestNote(reference, validateQuoteRequestNoteInput(request.body)) },
  })
}

export const prepareAdminQuotePricingController: RequestHandler = async (request, response) => {
  const reference = validateQuoteNumber(request.params.reference)
  response.json({
    success: true,
    message: 'Quotation prepared.',
    data: {
      quoteRequest: await prepareQuotePricing(reference, validatePrepareQuotePricingInput(request.body)),
    },
  })
}