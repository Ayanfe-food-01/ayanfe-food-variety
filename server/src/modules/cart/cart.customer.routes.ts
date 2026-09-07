import { Router } from 'express'
import { requireCustomerAuthentication, requireCustomerRole } from '../auth/auth.middleware.js'
import {
  getCustomerCartController,
  replaceCustomerCartController,
  syncCustomerCartController,
} from './cart.controller.js'
export const customerCartRoutes = Router()
customerCartRoutes.use(requireCustomerAuthentication, requireCustomerRole)
customerCartRoutes.get('/cart', getCustomerCartController)
customerCartRoutes.post('/cart/sync', syncCustomerCartController)
customerCartRoutes.put('/cart', replaceCustomerCartController)