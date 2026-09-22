import type { RequestHandler } from 'express'
import { isWholesaleCustomer } from '../products/product.wholesale.service.js'
import { getHomepageData } from './homepage.service.js'

/**
 * GET /api/v1/homepage
 *
 * Single request that returns everything the storefront home page renders.
 * Anonymous visitors are served the shared 15-minute cached payload; the
 * payload is rebuilt per-request for authenticated/wholesale customers so
 * their wishlist flags and wholesale prices stay correct.
 */
export const getHomepageController: RequestHandler = async (request, response) => {
  const data = await getHomepageData(
    request.authenticatedUser?.id,
    isWholesaleCustomer(request.authenticatedUser),
  )
  response.json({ data })
}