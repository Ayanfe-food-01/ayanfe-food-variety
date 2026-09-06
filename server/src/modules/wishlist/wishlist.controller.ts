import type { RequestHandler } from 'express'
import { HttpError } from '../../utils/http.js'
import { addToWishlist, getWishlist, getWishlistStatus, removeFromWishlist } from './wishlist.service.js'

const requireProductId = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(400, 'A valid product is required.')
  }
  return value
}

export const getWishlistController: RequestHandler = async (request, response) => {
  response.json({ data: await getWishlist(request.authenticatedUser!.id) })
}

export const addToWishlistController: RequestHandler = async (request, response) => {
  const productId = requireProductId(request.params.productId)
  response.status(201).json({ data: await addToWishlist(request.authenticatedUser!.id, productId) })
}

export const removeFromWishlistController: RequestHandler = async (request, response) => {
  const productId = requireProductId(request.params.productId)
  response.json({ data: await removeFromWishlist(request.authenticatedUser!.id, productId) })
}

export const getWishlistStatusController: RequestHandler = async (request, response) => {
  const productId = requireProductId(request.params.productId)
  response.json({ data: await getWishlistStatus(request.authenticatedUser!.id, productId) })
}