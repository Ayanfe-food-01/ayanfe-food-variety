import { Router } from 'express';
import { getCategories } from '../controllers/categoryController.js';
export const categoryRoutes = Router();
categoryRoutes.get('/', getCategories);
