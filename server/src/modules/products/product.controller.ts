import type { RequestHandler } from 'express'
import { HttpError } from '../../utils/http.js'
import { getProductById, getProducts } from './product.service.js'
import { requireProductIdentifier } from './product.validator.js'

export const getProductsController: RequestHandler = async (_request, response) => {
  const products = await getProducts()
  response.json({ data: products })
}

export const getProductByIdController: RequestHandler = async (request, response) => {
  const identifier = requireProductIdentifier(
    typeof request.params.id === 'string' ? request.params.id : undefined,
  )
  const product = await getProductById(identifier)

  if (!product) {
    throw new HttpError(404, 'Product not found')
  }

  response.json({ data: product })
}