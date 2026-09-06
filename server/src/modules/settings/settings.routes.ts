import { Router } from 'express'
import { getPublicStoreSettingsController } from './settings.controller.js'

export const settingsRoutes = Router()

settingsRoutes.get('/', getPublicStoreSettingsController)