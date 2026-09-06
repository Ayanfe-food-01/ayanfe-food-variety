import { Router } from 'express'
import { createRateLimit } from '../../middlewares/rateLimit.js'
import {
  getBankDetailsController,
  initializePaymentController,
  verifyPaymentController,
  paymentProofUpload,
  submitPaymentController,
} from './payment.controller.js'
import { requireCustomerAuthentication, requireCustomerRole } from '../auth/auth.middleware.js'

export const paymentRoutes = Router()

const INITIALIZE_LIMIT = createRateLimit(10, 15 * 60 * 1000)
const VERIFY_LIMIT = createRateLimit(20, 15 * 60 * 1000)

paymentRoutes.get('/bank-details', getBankDetailsController)
paymentRoutes.post(
  '/submit',
  createRateLimit(10, 15 * 60 * 1000),
  requireCustomerAuthentication,
  requireCustomerRole,
  paymentProofUpload,
  submitPaymentController,
)
paymentRoutes.post(
  '/submit-guest',
  createRateLimit(10, 15 * 60 * 1000),
  paymentProofUpload,
  submitPaymentController,
)
paymentRoutes.post(
  '/paystack/initialize',
  INITIALIZE_LIMIT,
  requireCustomerAuthentication,
  requireCustomerRole,
  initializePaymentController,
)
paymentRoutes.post(
  '/paystack/initialize-guest',
  INITIALIZE_LIMIT,
  initializePaymentController,
)
paymentRoutes.post(
  '/paystack/verify',
  VERIFY_LIMIT,
  requireCustomerAuthentication,
  requireCustomerRole,
  verifyPaymentController,
)
paymentRoutes.post(
  '/paystack/verify-guest',
  VERIFY_LIMIT,
  verifyPaymentController,
)