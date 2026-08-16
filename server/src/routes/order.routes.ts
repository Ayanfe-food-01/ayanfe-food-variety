import { Router } from 'express'
import { checkoutController, guestOrderController } from '../modules/orders/order.controller.js'
import {
  cancelCustomerOrderController,
  getCustomerOrderController,
  listCustomerOrdersController,
} from '../modules/orders/customer-order.controller.js'
import { createRateLimit } from '../middleware/rateLimit.js'
import { optionalCustomerAuthentication, requireCustomerAuthentication, requireCustomerRole } from '../middleware/auth.middleware.js'
import { HttpError } from '../utils/http.js'

const requireCheckoutRequestHeader: import('express').RequestHandler = (request, _response, next) => {
  if (request.get('X-Checkout-Request') !== '1') {
    next(new HttpError(403, 'A valid checkout request is required.'))
    return
  }
  next()
}

export const orderRoutes = Router()

orderRoutes.get('/', requireCustomerAuthentication, requireCustomerRole, listCustomerOrdersController)
orderRoutes.get('/guest/:orderNumber', guestOrderController)
orderRoutes.patch('/:orderNumber/cancel', requireCustomerAuthentication, requireCustomerRole, cancelCustomerOrderController)
orderRoutes.get('/:orderNumber', requireCustomerAuthentication, requireCustomerRole, getCustomerOrderController)
orderRoutes.post(
  '/',
  optionalCustomerAuthentication,
  requireCheckoutRequestHeader,
  createRateLimit(10, 15 * 60 * 1000),
  checkoutController,
)