import { Router } from 'express'
import { requireAdminAccess } from '../middleware/admin.middleware.js'
import {
  getAdminOrderController,
  getAdminPaymentController,
  getAnalyticsController,
  getDashboardController,
  archiveAdminOrderController,
  deleteAdminOrderController,
  listAdminOrdersController,
  listAdminPaymentsController,
  rejectAdminPaymentController,
  restoreAdminOrderController,
  updateAdminOrderStatusController,
  verifyAdminPaymentController,
} from '../modules/admin/admin.controller.js'
import {
  getAdminContactInformationController,
  getAdminPaymentSettingsController,
  getAdminStoreInformationController,
  updateAdminContactInformationController,
  updateAdminPaymentSettingsController,
  updateAdminStoreInformationController,
} from '../modules/settings/settings.controller.js'
import {
  createAdminProductController,
  deleteAdminProductController,
  getAdminProductController,
  listAdminProductsController,
  productImageUpload,
  updateAdminProductController,
  updateAdminProductFeaturedController,
  updateAdminProductStatusController,
} from '../modules/products/admin-product.controller.js'
import {
  createAdminCategoryController,
  deleteAdminCategoryController,
  getAdminCategoryController,
  listAdminCategoriesController,
  updateAdminCategoryController,
  updateAdminCategoryStatusController,
  categoryImageUpload,
} from '../modules/categories/category.controller.js'
import {
  bannerImageUpload,
  createAdminBannerController,
  deleteAdminBannerController,
  getAdminBannerController,
  listAdminBannersController,
  updateAdminBannerController,
  updateAdminBannerStatusController,
} from '../modules/banners/banner.controller.js'
import { changeAdminPasswordController } from '../modules/auth/auth.controller.js'
import {
  brandingImageUpload,
  getAdminBrandingController,
  updateAdminBrandingController,
} from '../modules/settings/branding.controller.js'

export const adminRoutes = Router()

adminRoutes.use(...requireAdminAccess)
adminRoutes.get('/categories', listAdminCategoriesController)
adminRoutes.post('/categories', categoryImageUpload, createAdminCategoryController)
adminRoutes.get('/categories/:id', getAdminCategoryController)
adminRoutes.patch('/categories/:id/status', updateAdminCategoryStatusController)
adminRoutes.patch('/categories/:id', categoryImageUpload, updateAdminCategoryController)
adminRoutes.delete('/categories/:id', deleteAdminCategoryController)
adminRoutes.get('/banners', listAdminBannersController)
adminRoutes.post('/banners', bannerImageUpload, createAdminBannerController)
adminRoutes.get('/banners/:id', getAdminBannerController)
adminRoutes.patch('/banners/:id/status', updateAdminBannerStatusController)
adminRoutes.patch('/banners/:id', bannerImageUpload, updateAdminBannerController)
adminRoutes.delete('/banners/:id', deleteAdminBannerController)
adminRoutes.get('/products', listAdminProductsController)
adminRoutes.get('/products/:id', getAdminProductController)
adminRoutes.post('/products', productImageUpload, createAdminProductController)
adminRoutes.patch('/products/:id', productImageUpload, updateAdminProductController)
adminRoutes.patch('/products/:id/status', updateAdminProductStatusController)
adminRoutes.patch('/products/:id/featured', updateAdminProductFeaturedController)
adminRoutes.delete('/products/:id', deleteAdminProductController)
adminRoutes.get('/dashboard', getDashboardController)
adminRoutes.get('/analytics', getAnalyticsController)
adminRoutes.get('/orders', listAdminOrdersController)
adminRoutes.get('/orders/:orderNumber', getAdminOrderController)
adminRoutes.patch('/orders/:orderNumber/status', updateAdminOrderStatusController)
adminRoutes.patch('/orders/:orderNumber/archive', archiveAdminOrderController)
adminRoutes.patch('/orders/:orderNumber/restore', restoreAdminOrderController)
adminRoutes.delete('/orders/:orderNumber', deleteAdminOrderController)
adminRoutes.get('/payments', listAdminPaymentsController)
adminRoutes.get('/payments/:id', getAdminPaymentController)
adminRoutes.post('/payments/:id/verify', verifyAdminPaymentController)
adminRoutes.post('/payments/:id/reject', rejectAdminPaymentController)
adminRoutes.get('/settings/store', getAdminStoreInformationController)
adminRoutes.put('/settings/store', updateAdminStoreInformationController)
adminRoutes.get('/settings/branding', getAdminBrandingController)
adminRoutes.put('/settings/branding', brandingImageUpload, updateAdminBrandingController)
adminRoutes.get('/settings/contact', getAdminContactInformationController)
adminRoutes.put('/settings/contact', updateAdminContactInformationController)
adminRoutes.get('/settings/payment', getAdminPaymentSettingsController)
adminRoutes.put('/settings/payment', updateAdminPaymentSettingsController)
adminRoutes.post('/settings/password', changeAdminPasswordController)