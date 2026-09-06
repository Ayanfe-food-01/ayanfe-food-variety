import { Router } from 'express'
import { getCategoriesController } from '../controllers/category.controller.js'

export const categoryRoutes = Router()

categoryRoutes.get('/', getCategoriesController)