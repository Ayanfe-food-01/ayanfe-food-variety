import { Router } from 'express'
import { getPublicBannersController } from '../controllers/banner.controller.js'

export const bannerRoutes = Router()

bannerRoutes.get('/', getPublicBannersController)