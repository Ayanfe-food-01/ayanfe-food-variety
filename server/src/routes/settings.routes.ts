import { Router } from 'express'
import { getPublicStoreSettingsController } from '../controllers/settings.controller.js'

export const settingsRoutes = Router()

settingsRoutes.get('/', getPublicStoreSettingsController)