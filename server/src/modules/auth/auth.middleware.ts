import type { RequestHandler } from 'express'
import { HttpError } from '../../utils/http.js'
import {
  getAuthenticatedUser,
  getCustomerSessionToken,
  getSessionToken,
  customerAuthCookie,
} from './auth.service.js'
import { getAuthenticatedCustomer } from './customer-auth.service.js'
import { UserRole, ShoppingMode } from '@prisma/client'

export const requireAuthentication: RequestHandler = async (request, _response, next) => {
  const user = await getAuthenticatedUser(getSessionToken(request.headers.cookie))
  if (!user) {
    next(new HttpError(401, 'Authentication is required.'))
    return
  }
  request.authenticatedUser = user
  next()
}

export const requireAdminRole: RequestHandler = (request, _response, next) => {
  if (!request.authenticatedUser || request.authenticatedUser.role !== UserRole.ADMIN) {
    next(new HttpError(403, 'Administrator access is required.'))
    return
  }
  next()
}

export const requireCustomerAuthentication: RequestHandler = async (request, response, next) => {
  const user = await getAuthenticatedCustomer(getCustomerSessionToken(request.headers.cookie))
  if (!user) {
    // Do not aggressively clear the session cookie on a single 401 to avoid
    // logging out users due to transient issues or third-party cookie blocking.
    // The client will handle 401 by re-prompting for authentication.
    next(new HttpError(401, 'Customer authentication is required.'))
    return
  }
  request.authenticatedUser = user
  next()
}

export const requireCustomerRole: RequestHandler = (request, _response, next) => {
  if (!request.authenticatedUser || request.authenticatedUser.role !== UserRole.CUSTOMER) {
    next(new HttpError(403, 'Customer access is required.'))
    return
  }
  next()
}

export const requireWholesaleMode: RequestHandler = (request, _response, next) => {
  if (
    !request.authenticatedUser
    || request.authenticatedUser.role !== UserRole.CUSTOMER
    || request.authenticatedUser.shoppingMode !== ShoppingMode.WHOLESALE
  ) {
    next(new HttpError(403, 'Switch to Wholesale mode to access wholesale pricing.'))
    return
  }
  next()
}

export const optionalCustomerAuthentication: RequestHandler = async (request, response, next) => {
  const user = await getAuthenticatedCustomer(getCustomerSessionToken(request.headers.cookie))
  if (user) request.authenticatedUser = user
  // Avoid aggressive cookie clearing on transient auth failures
  next()
}