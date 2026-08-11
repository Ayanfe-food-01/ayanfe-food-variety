import type { RequestHandler } from 'express'
import {
  addCustomerCartItem,
  clearCustomerCart,
  getCustomerCart,
  mergeCustomerCart,
  removeCustomerCartItem,
  replaceCustomerCart,
  updateCustomerCartItem,
} from './cart.service.js'
import { validateCartItemId, validateCartItemInput, validateCartItems, validateQuantity } from './cart.validator.js'

const customerId = (request: Parameters<RequestHandler>[0]) => request.authenticatedUser!.id

export const getCustomerCartController: RequestHandler = async (request, response) => {
  response.json({ success: true, data: await getCustomerCart(customerId(request)) })
}

export const addCustomerCartItemController: RequestHandler = async (request, response) => {
  response.status(201).json({
    success: true,
    data: await addCustomerCartItem(customerId(request), validateCartItemInput(request.body)),
  })
}

export const updateCustomerCartItemController: RequestHandler = async (request, response) => {
  const itemId = validateCartItemId(typeof request.params.id === 'string' ? request.params.id : undefined)
  const quantity = validateQuantity((request.body as Record<string, unknown>)?.quantity)
  response.json({
    success: true,
    data: await updateCustomerCartItem(customerId(request), itemId, quantity),
  })
}

export const removeCustomerCartItemController: RequestHandler = async (request, response) => {
  const itemId = validateCartItemId(typeof request.params.id === 'string' ? request.params.id : undefined)
  response.json({
    success: true,
    data: await removeCustomerCartItem(customerId(request), itemId),
  })
}

export const clearCustomerCartController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: await clearCustomerCart(customerId(request)),
  })
}

export const syncCustomerCartController: RequestHandler = async (request, response) => {
  response.json({ success: true, data: await mergeCustomerCart(customerId(request), validateCartItems(request.body)) })
}

export const replaceCustomerCartController: RequestHandler = async (request, response) => {
  response.json({ success: true, data: await replaceCustomerCart(customerId(request), validateCartItems(request.body)) })
}