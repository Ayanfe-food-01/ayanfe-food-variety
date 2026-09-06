import type { RequestHandler } from 'express'
import { HttpError } from '../../utils/http.js'
import {
  getCategoryProductSections,
  getFeaturedProducts,
  getNewArrivals,
  getPopularProducts,
  getProductById,
  getProductWholesalePricing,
  getProducts,
  isWholesaleCustomer,
  lookupWholesalePrice,
} from './product.service.js'
import {
  requireProductIdentifier,
  validateCategorySectionsQuery,
  validatePublicProductsQuery,
  validateWholesalePriceInput,
} from './product.validator.js'

export const getProductsController: RequestHandler = async (request, response) => {
  const page = await getProducts(
    validatePublicProductsQuery(request.query as Record<string, unknown>),
    request.authenticatedUser?.id,
    isWholesaleCustomer(request.authenticatedUser),
  )
  response.json({ data: page })
}

export const getCategoryProductSectionsController: RequestHandler = async (request, response) => {
  response.json({
    data: {
      sections: await getCategoryProductSections(
        validateCategorySectionsQuery(request.query as Record<string, unknown>),
        request.authenticatedUser?.id,
        isWholesaleCustomer(request.authenticatedUser),
      ),
    },
  })
}

export const getNewArrivalsController: RequestHandler = async (request, response) => {
  const page = await getNewArrivals(
    validatePublicProductsQuery(request.query as Record<string, unknown>),
    request.authenticatedUser?.id,
    isWholesaleCustomer(request.authenticatedUser),
  )
  response.json({ data: page })
}

export const getPopularProductsController: RequestHandler = async (request, response) => {
  const page = await getPopularProducts(
    validatePublicProductsQuery(request.query as Record<string, unknown>),
    request.authenticatedUser?.id,
    isWholesaleCustomer(request.authenticatedUser),
  )
  response.json({ data: page })
}

export const getFeaturedProductsController: RequestHandler = async (request, response) => {
  const page = await getFeaturedProducts(
    validatePublicProductsQuery(request.query as Record<string, unknown>),
    request.authenticatedUser?.id,
    isWholesaleCustomer(request.authenticatedUser),
  )
  response.json({ data: page })
}

export const getProductByIdController: RequestHandler = async (request, response) => {
  const identifier = requireProductIdentifier(
    typeof request.params.id === 'string' ? request.params.id : undefined,
  )
  const product = await getProductById(
    identifier,
    request.authenticatedUser?.id,
    isWholesaleCustomer(request.authenticatedUser),
  )

  if (!product) {
    throw new HttpError(404, 'Product not found')
  }

  response.json({ data: product })
}

export const getProductWholesalePricingController: RequestHandler = async (request, response) => {
  const identifier = requireProductIdentifier(
    typeof request.params.id === 'string' ? request.params.id : undefined,
  )
  const pricing = await getProductWholesalePricing(identifier)

  if (!pricing) {
    throw new HttpError(404, 'Product not found')
  }

  response.json({ data: pricing })
}

export const getWholesalePriceController: RequestHandler = async (request, response) => {
  const result = await lookupWholesalePrice(validateWholesalePriceInput(request.body))
  response.json({ data: result })
}