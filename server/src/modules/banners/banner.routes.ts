import { Router } from 'express'
import { getPublicBannersController } from './banner.controller.js'

export const bannerRoutes = Router()

bannerRoutes.get('/', getPublicBannersController)