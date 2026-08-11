import { Router } from 'express'
import { createOrderController } from '../modules/orders/order.controller.js'
import { createRateLimit } from '../middleware/rateLimit.js'
import { optionalCustomerAuthentication } from '../middleware/auth.middleware.js'
import { requireCustomerAuthentication, requireCustomerRole } from '../middleware/auth.middleware.js'
import { checkoutController } from '../modules/orders/order.controller.js'

export const orderRoutes = Router()

orderRoutes.post('/', createRateLimit(20, 15 * 60 * 1000), optionalCustomerAuthentication, createOrderController)
orderRoutes.post('/checkout', requireCustomerAuthentication, requireCustomerRole, createRateLimit(10, 15 * 60 * 1000), checkoutController)