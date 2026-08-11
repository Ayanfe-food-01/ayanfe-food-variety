import { Router } from 'express'
import {
  getProductByIdController,
  getProductsController,
} from '../modules/products/product.controller.js'

export const productRoutes = Router()

productRoutes.get('/', getProductsController)
productRoutes.get('/:id', getProductByIdController)