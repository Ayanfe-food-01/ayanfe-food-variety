import { Router } from 'express'
import { createRateLimit } from '../middleware/rateLimit.js'
import { optionalCustomerAuthentication } from '../middleware/auth.middleware.js'
import { createQuoteRequestController } from '../modules/quotes/quote.controller.js'

export const quoteRoutes = Router()

quoteRoutes.post(
  '/',
  optionalCustomerAuthentication,
  createRateLimit(10, 15 * 60 * 1000),
  createQuoteRequestController,
)