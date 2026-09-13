import { Router } from 'express'
import { requireCustomerAuthentication, requireCustomerRole } from '../auth/auth.middleware.js'
import {
  getCustomerAccountProfileController,
  updateCustomerAccountProfileController,
  listCustomerAccountAddressesController,
  createCustomerAccountAddressController,
  updateCustomerAccountAddressController,
  deleteCustomerAccountAddressController,
} from './customer-account.controller.js'

// Customer-owned account endpoints. Every controller derives the owning
// customer from the authenticated session (request.authenticatedUser) and never
// trusts a customer-supplied id, so customers can only reach their own profile
// and address book.
export const customerAccountRoutes = Router()

customerAccountRoutes.use(requireCustomerAuthentication, requireCustomerRole)

customerAccountRoutes.get('/profile', getCustomerAccountProfileController)
customerAccountRoutes.patch('/profile', updateCustomerAccountProfileController)
customerAccountRoutes.get('/addresses', listCustomerAccountAddressesController)
customerAccountRoutes.post('/addresses', createCustomerAccountAddressController)
customerAccountRoutes.patch('/addresses/:addressId', updateCustomerAccountAddressController)
customerAccountRoutes.delete('/addresses/:addressId', deleteCustomerAccountAddressController)