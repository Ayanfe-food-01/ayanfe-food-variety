import type { RequestHandler } from 'express'
import { HttpError } from '../../utils/http.js'
import { checkoutCustomerCart, getGuestOrderByNumber, getOrderById } from './order.service.js'
import { validateCheckoutInput, validateOrderId } from './order.validator.js'
import { validateOrderNumber } from './order.validator.js'

export const checkoutController: RequestHandler = async (request, response) => {
  const order = await checkoutCustomerCart(request.authenticatedUser?.id ?? null, validateCheckoutInput(request.body))
  response.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: { order },
  })
}

export const guestOrderController: RequestHandler = async (request, response) => {
  const orderNumber = validateOrderNumber(typeof request.params.orderNumber === 'string' ? request.params.orderNumber : undefined)
  const accessToken = request.get('X-Guest-Access-Token')?.trim()
  if (!accessToken) {
    throw new HttpError(401, 'Guest order access is required.')
  }
  const order = await getGuestOrderByNumber(orderNumber, accessToken)
  if (!order) throw new HttpError(404, 'Order not found.')
  response.json({ success: true, data: { order } })
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