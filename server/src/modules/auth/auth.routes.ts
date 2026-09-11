import { Router } from 'express'
import { createRateLimit } from '../../middlewares/rateLimit.js'
import { requireCustomerAuthentication, requireCustomerRole } from './auth.middleware.js'
import {
  adminGoogleCallbackController,
  adminGoogleStartController,
  loginController,
  logoutController,
  meController,
  customerLoginController,
  customerLogoutController,
  customerMeController,
  customerProvidersController,
  customerGoogleStartController,
  customerGoogleCallbackController,
  customerSignupController,
  customerVerifyEmailController,
  customerResendVerificationController,
  customerShoppingModeController,
  passwordResetRequestController,
  passwordResetController,
} from './auth.controller.js'

export const authRoutes = Router()

const googleOAuthStartRateLimit = createRateLimit(20, 15 * 60 * 1000)
const googleOAuthCallbackRateLimit = createRateLimit(30, 15 * 60 * 1000)

authRoutes.post('/login', createRateLimit(10, 15 * 60 * 1000), loginController)
authRoutes.post('/logout', logoutController)
authRoutes.get('/me', meController)
authRoutes.get('/customer/providers', customerProvidersController)
authRoutes.get('/customer/google', googleOAuthStartRateLimit, customerGoogleStartController)
authRoutes.get('/customer/google/callback', googleOAuthCallbackRateLimit, customerGoogleCallbackController)
authRoutes.get('/admin/google', googleOAuthStartRateLimit, adminGoogleStartController)
authRoutes.get('/admin/google/callback', googleOAuthCallbackRateLimit, adminGoogleCallbackController)
authRoutes.post('/customer/signup', createRateLimit(10, 15 * 60 * 1000), customerSignupController)
authRoutes.post('/customer/login', createRateLimit(10, 15 * 60 * 1000), customerLoginController)
authRoutes.post('/customer/verify-email', createRateLimit(20, 15 * 60 * 1000), customerVerifyEmailController)
authRoutes.post('/customer/resend-verification', createRateLimit(5, 15 * 60 * 1000), customerResendVerificationController)
authRoutes.post('/customer/logout', customerLogoutController)
authRoutes.get('/customer/me', customerMeController)
authRoutes.patch(
  '/customer/shopping-mode',
  requireCustomerAuthentication,
  requireCustomerRole,
  customerShoppingModeController,
)
authRoutes.post('/forgot-password', createRateLimit(5, 15 * 60 * 1000), passwordResetRequestController)
authRoutes.post('/reset-password', createRateLimit(10, 15 * 60 * 1000), passwordResetController)