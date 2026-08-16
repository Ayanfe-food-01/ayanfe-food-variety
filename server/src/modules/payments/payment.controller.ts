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

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const hasSupportedExtension = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.originalname)
    if (!allowedMimeTypes.has(file.mimetype) && !hasSupportedExtension) {
       callback(new HttpError(400, 'Payment receipt must be a JPG, PNG, WEBP, or HEIC/HEIF image.'))
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
  const guestAccessToken = typeof request.body.guestAccessToken === 'string'
    ? request.body.guestAccessToken.trim()
    : undefined
  const submission = await submitPayment(input, request.file, request.authenticatedUser?.id, guestAccessToken)
  response.status(201).json({
    success: true,
    message: 'Payment proof submitted and awaiting verification.',
    data: { payment: submission },
  })
}
