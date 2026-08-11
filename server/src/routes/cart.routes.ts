import { Router } from 'express'
import { requireCustomerAuthentication, requireCustomerRole } from '../middleware/auth.middleware.js'
import {
  addCustomerCartItemController,
  clearCustomerCartController,
  getCustomerCartController,
  removeCustomerCartItemController,
  updateCustomerCartItemController,
} from '../modules/cart/cart.controller.js'

export const cartRoutes = Router()
cartRoutes.use(requireCustomerAuthentication, requireCustomerRole)
cartRoutes.get('/', getCustomerCartController)
cartRoutes.post('/items', addCustomerCartItemController)
cartRoutes.patch('/items/:id', updateCustomerCartItemController)
cartRoutes.delete('/items/:id', removeCustomerCartItemController)
cartRoutes.delete('/', clearCustomerCartController)