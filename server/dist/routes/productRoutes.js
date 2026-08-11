import { Router } from 'express';
import { getProduct, getProducts } from '../controllers/productController.js';
export const productRoutes = Router();
productRoutes.get('/', getProducts);
productRoutes.get('/:id', getProduct);
