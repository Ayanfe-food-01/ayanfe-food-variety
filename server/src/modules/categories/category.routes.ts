import { Router } from 'express'
import { getCategoriesController } from './category.controller.js'

export const categoryRoutes = Router()

categoryRoutes.get('/', getCategoriesController)