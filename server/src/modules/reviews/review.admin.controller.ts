import type { RequestHandler } from 'express'
import {
  deleteReview,
  getAdminReview,
  listAdminReviews,
  updateReviewDisplayOrder,
  updateReviewFeatured,
  updateReviewStatus,
} from './review.admin.service.js'
import {
  validateAdminReviewsQuery,
  validateReviewDeletionInput,
  validateReviewDisplayOrderInput,
  validateReviewFeaturedInput,
  validateReviewId,
  validateReviewStatusInput,
} from './review.validator.js'

export const listAdminReviewsController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: await listAdminReviews(validateAdminReviewsQuery(request.query as Record<string, unknown>)),
  })
}

export const getAdminReviewController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: { review: await getAdminReview(validateReviewId(request.params.id)) },
  })
}

export const updateAdminReviewStatusController: RequestHandler = async (request, response) => {
  const review = await updateReviewStatus(
    validateReviewId(request.params.id),
    validateReviewStatusInput(request.body),
  )
  response.json({
    success: true,
    message: review.status === 'APPROVED' ? 'Review approved.' : 'Review rejected.',
    data: { review },
  })
}

export const updateAdminReviewFeaturedController: RequestHandler = async (request, response) => {
  const review = await updateReviewFeatured(
    validateReviewId(request.params.id),
    validateReviewFeaturedInput(request.body),
  )
  response.json({
    success: true,
    message: review.isFeatured ? 'Review marked as featured.' : 'Review removed from featured.',
    data: { review },
  })
}

export const updateAdminReviewOrderController: RequestHandler = async (request, response) => {
  const review = await updateReviewDisplayOrder(
    validateReviewId(request.params.id),
    validateReviewDisplayOrderInput(request.body),
  )
  response.json({
    success: true,
    message: 'Review display order updated.',
    data: { review },
  })
}

export const deleteAdminReviewController: RequestHandler = async (request, response) => {
  validateReviewDeletionInput(request.body)
  await deleteReview(validateReviewId(request.params.id))
  response.json({ success: true, message: 'Review deleted.' })
}