import { Router } from 'express';
import { getPublicStoreSettingsController } from '../modules/settings/settings.controller.js';
export const storeRoutes = Router();
storeRoutes.get('/settings', getPublicStoreSettingsController);
