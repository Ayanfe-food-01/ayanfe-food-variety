import { Router } from 'express'
import { requireCustomerAuthentication, requireCustomerRole } from '../auth/auth.middleware.js'
import {
  addCustomerCartItemController,
  clearCustomerCartController,
  getCustomerCartController,
  removeCustomerCartItemController,
  updateCustomerCartItemController,
} from './cart.controller.js'

export const cartRoutes = Router()
cartRoutes.use(requireCustomerAuthentication, requireCustomerRole)
cartRoutes.get('/', getCustomerCartController)
cartRoutes.post('/items', addCustomerCartItemController)
cartRoutes.patch('/items/:id', updateCustomerCartItemController)
cartRoutes.delete('/items/:id', removeCustomerCartItemController)
cartRoutes.delete('/', clearCustomerCartController)