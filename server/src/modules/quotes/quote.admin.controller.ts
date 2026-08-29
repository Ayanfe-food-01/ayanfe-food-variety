import type { RequestHandler } from 'express'
import {
  getAdminQuoteRequest,
  listAdminQuoteRequests,
  updateAdminQuoteRequestNote,
  updateAdminQuoteRequestStatus,
} from './quote.service.js'
import {
  validateQuoteNumber,
  validateQuoteRequestNoteInput,
  validateQuoteRequestQuery,
  validateQuoteRequestStatusInput,
} from './quote.validator.js'

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
  response.json({
    success: true,
    message: 'Quote status updated.',
    data: { quoteRequest: await updateAdminQuoteRequestStatus(reference, validateQuoteRequestStatusInput(request.body)) },
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