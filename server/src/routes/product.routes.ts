import { Router } from 'express'
import {
  getNewArrivalsController,
  getPopularProductsController,
  getProductByIdController,
  getProductsController,
} from '../modules/products/product.controller.js'
import { optionalCustomerAuthentication } from '../middleware/auth.middleware.js'

export const productRoutes = Router()

productRoutes.get('/', optionalCustomerAuthentication, getProductsController)
productRoutes.get('/new-arrivals', optionalCustomerAuthentication, getNewArrivalsController)
productRoutes.get('/popular', optionalCustomerAuthentication, getPopularProductsController)
productRoutes.get('/:id', optionalCustomerAuthentication, getProductByIdController)