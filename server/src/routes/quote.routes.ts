import { Router } from 'express'
import { createRateLimit } from '../middleware/rateLimit.js'
import {
  optionalCustomerAuthentication,
  requireCustomerAuthentication,
  requireCustomerRole,
} from '../middleware/auth.middleware.js'
import { createQuoteRequestController } from '../modules/quotes/quote.controller.js'
import {
  acceptCustomerQuoteRequestController,
  convertCustomerQuoteRequestController,
  getCustomerQuoteRequestController,
  listCustomerQuoteRequestsController,
  rejectCustomerQuoteRequestController,
} from '../modules/quotes/customer-quote.controller.js'

export const quoteRoutes = Router()

quoteRoutes.post(
  '/',
  optionalCustomerAuthentication,
  createRateLimit(10, 15 * 60 * 1000),
  createQuoteRequestController,
)

quoteRoutes.get('/', requireCustomerAuthentication, requireCustomerRole, listCustomerQuoteRequestsController)
quoteRoutes.get('/:reference', requireCustomerAuthentication, requireCustomerRole, getCustomerQuoteRequestController)
quoteRoutes.post('/:reference/convert', requireCustomerAuthentication, requireCustomerRole, convertCustomerQuoteRequestController)
quoteRoutes.post('/:reference/accept', requireCustomerAuthentication, requireCustomerRole, acceptCustomerQuoteRequestController)
quoteRoutes.post('/:reference/reject', requireCustomerAuthentication, requireCustomerRole, rejectCustomerQuoteRequestController)