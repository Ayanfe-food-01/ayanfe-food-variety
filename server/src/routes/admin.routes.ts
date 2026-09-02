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
import {
  listAdminNotificationsController,
  markAdminNotificationReadController,
  markAllAdminNotificationsReadController,
} from '../modules/notifications/notification.controller.js'
import {
  getAdminQuoteRequestController,
  listAdminQuoteRequestsController,
  prepareAdminQuotePricingController,
  updateAdminQuoteRequestNoteController,
  updateAdminQuoteRequestStatusController,
} from '../modules/quotes/quote.admin.controller.js'
import {
  createAdminTestimonialController,
  deleteAdminTestimonialController,
  getAdminTestimonialController,
  listAdminTestimonialsController,
  testimonialAvatarUpload,
  updateAdminTestimonialController,
  updateAdminTestimonialFeaturedController,
  updateAdminTestimonialStatusController,
} from '../modules/testimonials/testimonial.controller.js'
import {
  deleteAdminReviewController,
  getAdminReviewController,
  listAdminReviewsController,
  updateAdminReviewFeaturedController,
  updateAdminReviewOrderController,
  updateAdminReviewStatusController,
} from '../modules/reviews/review.admin.controller.js'
import {
  createAdminDeliveryZoneController,
  deleteAdminDeliveryZoneController,
  getAdminDeliveryZoneController,
  listAdminDeliveryZonesController,
  reorderAdminDeliveryZonesController,
  updateAdminDeliveryZoneController,
  updateAdminDeliveryZoneStatusController,
} from '../modules/delivery-zones/delivery-zone.controller.js'

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
adminRoutes.get('/testimonials', listAdminTestimonialsController)
adminRoutes.post('/testimonials', testimonialAvatarUpload, createAdminTestimonialController)
adminRoutes.get('/testimonials/:id', getAdminTestimonialController)
adminRoutes.patch('/testimonials/:id/status', updateAdminTestimonialStatusController)
adminRoutes.patch('/testimonials/:id/featured', updateAdminTestimonialFeaturedController)
adminRoutes.patch('/testimonials/:id', testimonialAvatarUpload, updateAdminTestimonialController)
adminRoutes.delete('/testimonials/:id', deleteAdminTestimonialController)
adminRoutes.get('/reviews', listAdminReviewsController)
adminRoutes.get('/reviews/:id', getAdminReviewController)
adminRoutes.patch('/reviews/:id/status', updateAdminReviewStatusController)
adminRoutes.patch('/reviews/:id/featured', updateAdminReviewFeaturedController)
adminRoutes.patch('/reviews/:id/order', updateAdminReviewOrderController)
adminRoutes.delete('/reviews/:id', deleteAdminReviewController)
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
adminRoutes.get('/quotes', listAdminQuoteRequestsController)
adminRoutes.get('/quotes/:reference', getAdminQuoteRequestController)
adminRoutes.patch('/quotes/:reference/status', updateAdminQuoteRequestStatusController)
adminRoutes.patch('/quotes/:reference/note', updateAdminQuoteRequestNoteController)
adminRoutes.post('/quotes/:reference/price', prepareAdminQuotePricingController)
adminRoutes.get('/notifications', listAdminNotificationsController)
adminRoutes.post('/notifications/read-all', markAllAdminNotificationsReadController)
adminRoutes.patch('/notifications/:id/read', markAdminNotificationReadController)
adminRoutes.get('/settings/store', getAdminStoreInformationController)
adminRoutes.put('/settings/store', updateAdminStoreInformationController)
adminRoutes.get('/settings/branding', getAdminBrandingController)
adminRoutes.put('/settings/branding', brandingImageUpload, updateAdminBrandingController)
adminRoutes.get('/settings/contact', getAdminContactInformationController)
adminRoutes.put('/settings/contact', updateAdminContactInformationController)
adminRoutes.get('/settings/payment', getAdminPaymentSettingsController)
adminRoutes.put('/settings/payment', updateAdminPaymentSettingsController)
adminRoutes.post('/settings/password', changeAdminPasswordController)
adminRoutes.get('/delivery-zones', listAdminDeliveryZonesController)
adminRoutes.post('/delivery-zones', createAdminDeliveryZoneController)
adminRoutes.put('/delivery-zones/reorder', reorderAdminDeliveryZonesController)
adminRoutes.get('/delivery-zones/:id', getAdminDeliveryZoneController)
adminRoutes.patch('/delivery-zones/:id/status', updateAdminDeliveryZoneStatusController)
adminRoutes.patch('/delivery-zones/:id', updateAdminDeliveryZoneController)
adminRoutes.delete('/delivery-zones/:id', deleteAdminDeliveryZoneController)