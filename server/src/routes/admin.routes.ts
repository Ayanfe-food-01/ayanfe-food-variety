import { Router } from 'express'
import { requireAdminAccess } from '../middleware/admin.middleware.js'
import {
  getAdminOrderController,
  getAdminPaymentController,
  getAdminPaymentSettingsController,
  getDashboardController,
  listAdminOrdersController,
  listAdminPaymentsController,
  rejectAdminPaymentController,
  updateAdminOrderStatusController,
  updateAdminPaymentSettingsController,
  verifyAdminPaymentController,
} from '../modules/admin/admin.controller.js'

export const adminRoutes = Router()

adminRoutes.use(...requireAdminAccess)
adminRoutes.get('/dashboard', getDashboardController)
adminRoutes.get('/orders', listAdminOrdersController)
adminRoutes.get('/orders/:orderNumber', getAdminOrderController)
adminRoutes.patch('/orders/:orderNumber/status', updateAdminOrderStatusController)
adminRoutes.get('/payments', listAdminPaymentsController)
adminRoutes.get('/payments/:id', getAdminPaymentController)
adminRoutes.post('/payments/:id/verify', verifyAdminPaymentController)
adminRoutes.post('/payments/:id/reject', rejectAdminPaymentController)
adminRoutes.get('/settings/payment', getAdminPaymentSettingsController)
adminRoutes.put('/settings/payment', updateAdminPaymentSettingsController)