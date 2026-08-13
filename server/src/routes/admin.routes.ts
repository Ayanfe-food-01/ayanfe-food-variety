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
  heroImageUpload,
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
  deleteAdminCategoryController,
  getAdminCategoryController,
  listAdminCategoriesController,
  updateAdminCategoryController,
  updateAdminCategoryStatusController,
  categoryImageUpload,
} from '../modules/categories/category.controller.js'

export const adminRoutes = Router()

adminRoutes.use(...requireAdminAccess)
adminRoutes.get('/categories', listAdminCategoriesController)
adminRoutes.post('/categories', categoryImageUpload, createAdminCategoryController)
adminRoutes.get('/categories/:id', getAdminCategoryController)
adminRoutes.patch('/categories/:id/status', updateAdminCategoryStatusController)
adminRoutes.patch('/categories/:id', categoryImageUpload, updateAdminCategoryController)
adminRoutes.delete('/categories/:id', deleteAdminCategoryController)
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
  adminRoutes.put('/settings/store', heroImageUpload, updateAdminStoreInformationController)
adminRoutes.get('/settings/contact', getAdminContactInformationController)
adminRoutes.put('/settings/contact', updateAdminContactInformationController)
adminRoutes.get('/settings/payment', getAdminPaymentSettingsController)
adminRoutes.put('/settings/payment', updateAdminPaymentSettingsController)