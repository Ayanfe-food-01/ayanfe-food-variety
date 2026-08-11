import { Router } from 'express'
import { getCategoriesController } from '../modules/categories/category.controller.js'

export const categoryRoutes = Router()

categoryRoutes.get('/', getCategoriesController)