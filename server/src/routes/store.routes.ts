import { Router } from 'express'
import { getPublicStoreSettingsController } from '../modules/settings/settings.controller.js'
import { getPublicBannersController } from '../modules/banners/banner.controller.js'
import { getPublicCustomerStoriesController } from '../modules/customer-stories/customer-stories.controller.js'

export const storeRoutes = Router()

storeRoutes.get('/settings', getPublicStoreSettingsController)
storeRoutes.get('/banners', getPublicBannersController)
storeRoutes.get('/customer-stories', getPublicCustomerStoriesController)