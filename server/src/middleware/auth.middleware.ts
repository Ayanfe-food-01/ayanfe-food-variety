import type { RequestHandler } from 'express'
import { HttpError } from '../utils/http.js'
import {
  getAuthenticatedCustomer,
  getAuthenticatedUser,
  getCustomerSessionToken,
  getSessionToken,
} from '../modules/auth/auth.service.js'
import { UserRole } from '@prisma/client'

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

export const requireCustomerAuthentication: RequestHandler = async (request, _response, next) => {
  const user = await getAuthenticatedCustomer(getCustomerSessionToken(request.headers.cookie))
  if (!user) {
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

export const optionalCustomerAuthentication: RequestHandler = async (request, _response, next) => {
  const user = await getAuthenticatedCustomer(getCustomerSessionToken(request.headers.cookie))
  if (user) request.authenticatedUser = user
  next()
}