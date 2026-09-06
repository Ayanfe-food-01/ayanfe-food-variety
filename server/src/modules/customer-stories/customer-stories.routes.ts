import { Router } from 'express'
import { getPublicCustomerStoriesController } from './customer-stories.controller.js'

export const customerStoriesRoutes = Router()

customerStoriesRoutes.get('/', getPublicCustomerStoriesController)