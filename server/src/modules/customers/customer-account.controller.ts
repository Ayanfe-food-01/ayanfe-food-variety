import type { RequestHandler } from 'express'
import { HttpError } from '../../utils/http.js'
import {
  getCustomerAccountProfileService,
  updateCustomerAccountProfileService,
  listCustomerAccountAddressesService,
  createCustomerAccountAddressService,
  updateCustomerAccountAddressService,
  deleteCustomerAccountAddressService,
  createCustomerDefaultAddressFromInput,
} from './customer-account.service.js'
import {
  validateCustomerAddressSaveInput,
  validateCustomerProfileUpdateInput,
  validateUuid,
} from './customer-account.validator.js'

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

const requireUuid = (value: string | string[] | undefined, field: string): string => {
  const candidate = Array.isArray(value) ? value[0] : value
  if (!candidate || !UUID_PATTERN.test(candidate)) {
    throw new HttpError(400, `${field} is invalid.`)
  }
  return candidate
}

export const getCustomerAccountProfileController: RequestHandler = async (request, response) => {
  if (!request.authenticatedUser?.id) {
    throw new HttpError(401, 'Authentication is required.')
  }
  const profile = await getCustomerAccountProfileService(request.authenticatedUser.id)
  response.json({ success: true, data: { profile } })
}

export const updateCustomerAccountProfileController: RequestHandler = async (request, response) => {
  if (!request.authenticatedUser?.id) {
    throw new HttpError(401, 'Authentication is required.')
  }
  const input = validateCustomerProfileUpdateInput(request.body)
  const profile = await updateCustomerAccountProfileService(request.authenticatedUser.id, input)
  response.json({ success: true, data: { profile } })
}

export const listCustomerAccountAddressesController: RequestHandler = async (request, response) => {
  if (!request.authenticatedUser?.id) {
    throw new HttpError(401, 'Authentication is required.')
  }
  const addresses = await listCustomerAccountAddressesService(request.authenticatedUser.id)
  response.json({ success: true, data: { addresses } })
}

export const createCustomerAccountAddressController: RequestHandler = async (request, response) => {
  if (!request.authenticatedUser?.id) {
    throw new HttpError(401, 'Authentication is required.')
  }
  const input = validateCustomerAddressSaveInput(request.body)
  const addresses = await createCustomerAccountAddressService(request.authenticatedUser.id, input)
  response.status(201).json({ success: true, data: { addresses } })
}

export const updateCustomerAccountAddressController: RequestHandler = async (request, response) => {
  if (!request.authenticatedUser?.id) {
    throw new HttpError(401, 'Authentication is required.')
  }
  const addressId = requireUuid(request.params.addressId, 'Address id')
  const input = validateCustomerAddressSaveInput(request.body)
  const addresses = await updateCustomerAccountAddressService(
    request.authenticatedUser.id,
    addressId,
    input,
  )
  response.json({ success: true, data: { addresses } })
}

export const deleteCustomerAccountAddressController: RequestHandler = async (request, response) => {
  if (!request.authenticatedUser?.id) {
    throw new HttpError(401, 'Authentication is required.')
  }
  const addressId = requireUuid(request.params.addressId, 'Address id')
  const addresses = await deleteCustomerAccountAddressService(
    request.authenticatedUser.id,
    addressId,
  )
  response.json({ success: true, data: { addresses } })
}
