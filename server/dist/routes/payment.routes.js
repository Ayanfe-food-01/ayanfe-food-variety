import { Router } from 'express';
import { createRateLimit } from '../middleware/rateLimit.js';
import { getBankDetailsController, paymentProofUpload, submitPaymentController, } from '../modules/payments/payment.controller.js';
import { requireCustomerAuthentication, requireCustomerRole } from '../middleware/auth.middleware.js';
export const paymentRoutes = Router();
paymentRoutes.get('/bank-details', getBankDetailsController);
paymentRoutes.post('/submit', createRateLimit(10, 15 * 60 * 1000), requireCustomerAuthentication, requireCustomerRole, paymentProofUpload, submitPaymentController);
