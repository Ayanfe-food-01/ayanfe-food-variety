import { Router } from 'express'
import { checkoutController, guestOrderController, guestOrderTrackingController } from '../modules/orders/order.controller.js'
import {
  cancelCustomerOrderController,
  getCustomerOrderController,
  listCustomerOrdersController,
} from '../modules/orders/customer-order.controller.js'
import { createRateLimit } from '../middleware/rateLimit.js'
import { optionalCustomerAuthentication, requireCustomerAuthentication, requireCustomerRole } from '../middleware/auth.middleware.js'
import { HttpError } from '../utils/http.js'
import {
  getCustomerOrderReviewEligibilityController,
  submitCustomerReviewController,
} from '../modules/reviews/review.controller.js'

const requireCheckoutRequestHeader: import('express').RequestHandler = (request, _response, next) => {
  if (request.get('X-Checkout-Request') !== '1') {
    next(new HttpError(403, 'A valid checkout request is required.'))
    return
  }
  next()
}

export const orderRoutes = Router()

orderRoutes.get('/', requireCustomerAuthentication, requireCustomerRole, listCustomerOrdersController)
orderRoutes.post('/guest/track', createRateLimit(10, 15 * 60 * 1000), guestOrderTrackingController)
orderRoutes.get('/guest/:orderNumber', guestOrderController)
orderRoutes.patch('/:orderNumber/cancel', requireCustomerAuthentication, requireCustomerRole, cancelCustomerOrderController)
orderRoutes.get('/:orderNumber/review-eligibility', requireCustomerAuthentication, requireCustomerRole, getCustomerOrderReviewEligibilityController)
orderRoutes.post('/:orderNumber/reviews', requireCustomerAuthentication, requireCustomerRole, createRateLimit(20, 60 * 60 * 1000), submitCustomerReviewController)
orderRoutes.get('/:orderNumber', requireCustomerAuthentication, requireCustomerRole, getCustomerOrderController)
orderRoutes.post(
  '/',
  optionalCustomerAuthentication,
  requireCheckoutRequestHeader,
  createRateLimit(10, 15 * 60 * 1000),
  checkoutController,
)