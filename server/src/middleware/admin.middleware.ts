import type { RequestHandler } from 'express'
import { UserRole } from '@prisma/client'
import { HttpError } from '../utils/http.js'
import {
  getAuthenticatedCustomer,
  getAuthenticatedUser,
  getCustomerSessionToken,
  getSessionToken,
} from '../modules/auth/auth.service.js'
import { requireAdminRole } from './auth.middleware.js'

export { requireAdminRole }

const requireAdminAuthentication: RequestHandler = async (request, _response, next) => {
  const admin = await getAuthenticatedUser(getSessionToken(request.headers.cookie))
  if (admin) {
    request.authenticatedUser = admin
    next()
    return
  }

  const customer = await getAuthenticatedCustomer(getCustomerSessionToken(request.headers.cookie))
  if (customer?.role === UserRole.CUSTOMER) {
    next(new HttpError(403, 'Administrator access is required.'))
    return
  }

  next(new HttpError(401, 'Authentication is required.'))
}

/**
 * Centralized admin boundary. Authentication and role checks remain separate
 * so additional authenticated roles can be introduced without rewriting admin services.
 */
export const requireAdminAccess = [requireAdminAuthentication, requireAdminRole]