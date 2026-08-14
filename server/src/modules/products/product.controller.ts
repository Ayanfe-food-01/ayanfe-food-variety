import type { RequestHandler } from 'express'
import { HttpError } from '../../utils/http.js'
import { getNewArrivals, getPopularProducts, getProductById, getProducts } from './product.service.js'
import { requireProductIdentifier, validatePublicProductsQuery } from './product.validator.js'

export const getProductsController: RequestHandler = async (request, response) => {
  const page = await getProducts(validatePublicProductsQuery(request.query as Record<string, unknown>), request.authenticatedUser?.id)
  response.json({ data: page })
}

export const getNewArrivalsController: RequestHandler = async (request, response) => {
  const page = await getNewArrivals(validatePublicProductsQuery(request.query as Record<string, unknown>), request.authenticatedUser?.id)
  response.json({ data: page })
}

export const getPopularProductsController: RequestHandler = async (request, response) => {
  const page = await getPopularProducts(validatePublicProductsQuery(request.query as Record<string, unknown>), request.authenticatedUser?.id)
  response.json({ data: page })
}

export const getProductByIdController: RequestHandler = async (request, response) => {
  const identifier = requireProductIdentifier(
    typeof request.params.id === 'string' ? request.params.id : undefined,
  )
  const product = await getProductById(identifier, request.authenticatedUser?.id)

  if (!product) {
    throw new HttpError(404, 'Product not found')
  }

  response.json({ data: product })
}