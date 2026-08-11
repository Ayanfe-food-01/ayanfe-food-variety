import { Router } from 'express'
import { requireAdminAccess } from '../middleware/admin.middleware.js'
import {
  getAdminOrderController,
  getAdminPaymentController,
  getDashboardController,
  listAdminOrdersController,
  listAdminPaymentsController,
  rejectAdminPaymentController,
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
  getAdminProductController,
  listAdminProductsController,
  productImageUpload,
  updateAdminProductController,
  updateAdminProductStatusController,
} from '../modules/products/admin-product.controller.js'
import {
  createAdminCategoryController,
  listAdminCategoriesController,
  updateAdminCategoryStatusController,
} from '../modules/categories/category.controller.js'

export const adminRoutes = Router()

adminRoutes.use(...requireAdminAccess)
adminRoutes.get('/categories', listAdminCategoriesController)
adminRoutes.post('/categories', createAdminCategoryController)
adminRoutes.patch('/categories/:id/status', updateAdminCategoryStatusController)
adminRoutes.get('/products', listAdminProductsController)
adminRoutes.get('/products/:id', getAdminProductController)
adminRoutes.post('/products', productImageUpload, createAdminProductController)
adminRoutes.patch('/products/:id', productImageUpload, updateAdminProductController)
adminRoutes.patch('/products/:id/status', updateAdminProductStatusController)
adminRoutes.get('/dashboard', getDashboardController)
adminRoutes.get('/orders', listAdminOrdersController)
adminRoutes.get('/orders/:orderNumber', getAdminOrderController)
adminRoutes.patch('/orders/:orderNumber/status', updateAdminOrderStatusController)
adminRoutes.get('/payments', listAdminPaymentsController)
adminRoutes.get('/payments/:id', getAdminPaymentController)
adminRoutes.post('/payments/:id/verify', verifyAdminPaymentController)
adminRoutes.post('/payments/:id/reject', rejectAdminPaymentController)
adminRoutes.get('/settings/store', getAdminStoreInformationController)
adminRoutes.put('/settings/store', updateAdminStoreInformationController)
adminRoutes.get('/settings/contact', getAdminContactInformationController)
adminRoutes.put('/settings/contact', updateAdminContactInformationController)
adminRoutes.get('/settings/payment', getAdminPaymentSettingsController)
adminRoutes.put('/settings/payment', updateAdminPaymentSettingsController)