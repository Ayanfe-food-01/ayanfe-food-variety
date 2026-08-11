import { Router } from 'express'
import { requireCustomerAuthentication, requireCustomerRole } from '../middleware/auth.middleware.js'
import {
  getCustomerCartController,
  replaceCustomerCartController,
  syncCustomerCartController,
} from '../modules/cart/cart.controller.js'
export const customerRoutes = Router()
customerRoutes.use(requireCustomerAuthentication, requireCustomerRole)
customerRoutes.get('/cart', getCustomerCartController)
customerRoutes.post('/cart/sync', syncCustomerCartController)
customerRoutes.put('/cart', replaceCustomerCartController)