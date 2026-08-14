import { Router } from 'express';
import { getNewArrivalsController, getPopularProductsController, getProductByIdController, getProductsController, } from '../modules/products/product.controller.js';
export const productRoutes = Router();
productRoutes.get('/', getProductsController);
productRoutes.get('/new-arrivals', getNewArrivalsController);
productRoutes.get('/popular', getPopularProductsController);
productRoutes.get('/:id', getProductByIdController);
