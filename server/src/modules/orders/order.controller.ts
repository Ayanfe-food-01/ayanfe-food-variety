import type { RequestHandler } from 'express'
import { HttpError } from '../../utils/http.js'
import { checkoutCustomerCart, createOrder, getOrderById } from './order.service.js'
import { validateCheckoutInput, validateCreateOrderInput, validateOrderId } from './order.validator.js'

export const checkoutController: RequestHandler = async (request, response) => {
  const order = await checkoutCustomerCart(request.authenticatedUser!.id, validateCheckoutInput(request.body))
  response.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: { order },
  })
}

export const createOrderController: RequestHandler = async (request, response) => {
  const input = validateCreateOrderInput(request.body)
  const order = await createOrder({
    ...input,
    userId: request.authenticatedUser?.role === 'CUSTOMER' ? request.authenticatedUser.id : undefined,
  })

  response.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: { order },
  })
}

export const getOrderByIdController: RequestHandler = async (request, response) => {
  const id = validateOrderId(typeof request.params.id === 'string' ? request.params.id : undefined)
  const order = await getOrderById(id)

  if (!order) {
    throw new HttpError(404, 'Order not found')
  }

  response.json({
    success: true,
    data: { order },
  })
}