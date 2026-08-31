import { Router } from 'express'
import {
  getNewArrivalsController,
  getFeaturedProductsController,
  getCategoryProductSectionsController,
  getPopularProductsController,
  getProductByIdController,
  getProductWholesalePricingController,
  getProductsController,
  getWholesalePriceController,
} from '../modules/products/product.controller.js'
import { getPublicProductReviewsController } from '../modules/reviews/review.controller.js'
import {
  optionalCustomerAuthentication,
  requireCustomerAuthentication,
  requireWholesaleMode,
} from '../middleware/auth.middleware.js'

export const productRoutes = Router()

productRoutes.get('/', optionalCustomerAuthentication, getProductsController)
productRoutes.get('/category-sections', optionalCustomerAuthentication, getCategoryProductSectionsController)
productRoutes.get('/new-arrivals', optionalCustomerAuthentication, getNewArrivalsController)
productRoutes.get('/featured', optionalCustomerAuthentication, getFeaturedProductsController)
productRoutes.get('/popular', optionalCustomerAuthentication, getPopularProductsController)
productRoutes.post('/wholesale-price', requireCustomerAuthentication, requireWholesaleMode, getWholesalePriceController)
productRoutes.get('/:id/wholesale', requireCustomerAuthentication, requireWholesaleMode, getProductWholesalePricingController)
productRoutes.get('/:id/reviews', optionalCustomerAuthentication, getPublicProductReviewsController)
productRoutes.get('/:id', optionalCustomerAuthentication, getProductByIdController)