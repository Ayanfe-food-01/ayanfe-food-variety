import { Router } from 'express'
import { createRateLimit } from '../../middlewares/rateLimit.js'
import { optionalCustomerAuthentication } from '../auth/auth.middleware.js'
import { createContactMessageController } from './contact.controller.js'

export const contactRoutes = Router()

contactRoutes.post(
  '/',
  optionalCustomerAuthentication,
  createRateLimit(5, 15 * 60 * 1000),
  createContactMessageController,
)