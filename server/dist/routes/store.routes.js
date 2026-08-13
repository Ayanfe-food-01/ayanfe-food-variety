import { Router } from 'express';
import { getPublicStoreSettingsController } from '../modules/settings/settings.controller.js';
import { getPublicBannersController } from '../modules/banners/banner.controller.js';
export const storeRoutes = Router();
storeRoutes.get('/settings', getPublicStoreSettingsController);
storeRoutes.get('/banners', getPublicBannersController);
