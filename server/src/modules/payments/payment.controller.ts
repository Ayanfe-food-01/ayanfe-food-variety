import type { RequestHandler } from 'express'
import multer from 'multer'
import { HttpError } from '../../utils/http.js'
import {
  getBankDetails,
  submitPayment,
} from './payment.service.js'
import {
  validateSubmitPaymentInput,
} from './payment.validator.js'

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new HttpError(400, 'Payment receipt must be a JPG, PNG, or WEBP image.'))
      return
    }
    callback(null, true)
  },
})

export const paymentProofUpload: RequestHandler = (request, response, next) => {
  upload.single('proof')(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      next(new HttpError(400, 'Payment receipt must be 5 MB or smaller.'))
      return
    }
    next(error)
  })
}

export const getBankDetailsController: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: { bank: await getBankDetails() } })
}

export const submitPaymentController: RequestHandler = async (request, response) => {
  const input = validateSubmitPaymentInput(request.body)
  const submission = await submitPayment(input, request.file, request.authenticatedUser?.id)
  response.status(201).json({
    success: true,
    message: 'Payment proof submitted and awaiting verification.',
    data: { payment: submission },
  })
}
