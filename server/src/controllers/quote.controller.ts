import type { RequestHandler } from 'express'
import { createQuoteRequest } from '../services/quote.service.js'
import { validateCreateQuoteRequestInput } from '../validators/quote.validator.js'

export const createQuoteRequestController: RequestHandler = async (request, response) => {
  const { quoteRequest, created } = await createQuoteRequest(
    request.authenticatedUser,
    validateCreateQuoteRequestInput(request.body),
  )
  response.status(created ? 201 : 200).json({
    success: true,
    message: created
      ? "Your quote request has been received. We'll review your request and get back to you."
      : 'This quote request has already been received.',
    data: { quoteRequest },
  })
}