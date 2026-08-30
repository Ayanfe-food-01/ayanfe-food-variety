import type { RequestHandler } from 'express'
import { validateOrderNumber } from '../orders/order.validator.js'
import { getOrderReviewEligibility, submitProductReview } from './review.service.js'
import { validateReviewCreateInput } from './review.validator.js'

export const getCustomerOrderReviewEligibilityController: RequestHandler = async (request, response) => {
  const orderNumber = validateOrderNumber(
    typeof request.params.orderNumber === 'string' ? request.params.orderNumber : undefined,
  )
  response.json({
    success: true,
    data: { eligibility: await getOrderReviewEligibility(request.authenticatedUser!.id, orderNumber) },
  })
}

export const submitCustomerReviewController: RequestHandler = async (request, response) => {
  const orderNumber = validateOrderNumber(
    typeof request.params.orderNumber === 'string' ? request.params.orderNumber : undefined,
  )
  const review = await submitProductReview(
    request.authenticatedUser!.id,
    orderNumber,
    validateReviewCreateInput(request.body),
  )
  response.status(201).json({
    success: true,
    message: 'Review submitted.',
    data: { review },
  })
}