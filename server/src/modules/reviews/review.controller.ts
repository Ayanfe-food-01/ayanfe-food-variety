import type { RequestHandler } from 'express'
import { validateOrderNumber } from '../orders/order.validator.js'
import { getOrderReviewEligibility, getPublicProductReviews, submitProductReview } from './review.service.js'
import { validatePublicProductReviewsQuery, validateReviewCreateInput } from './review.validator.js'

export const getPublicProductReviewsController: RequestHandler = async (request, response) => {
  const identifier = typeof request.params.id === 'string' ? request.params.id : ''
  const data = await getPublicProductReviews(
    identifier,
    validatePublicProductReviewsQuery(request.query as Record<string, unknown>),
    request.authenticatedUser?.id,
  )
  response.json({
    success: true,
    data,
  })
}

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