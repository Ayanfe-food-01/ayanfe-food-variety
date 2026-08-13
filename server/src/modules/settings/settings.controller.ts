import type { RequestHandler } from 'express'
import multer from 'multer'
import { HttpError } from '../../utils/http.js'
import {
  getAdminContactInformation,
  getAdminPaymentSettings,
  getAdminStoreInformation,
  getPublicStoreSettings,
  updateAdminContactInformation,
  updateAdminPaymentSettings,
  updateAdminStoreInformation,
} from './settings.service.js'
import { deleteHeroImage, uploadHeroImage } from './settings.storage.js'
import {
  validateContactInformationInput,
  validatePaymentSettingsInput,
  validateStoreInformationInput,
} from './settings.validator.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, fieldSize: 1 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new HttpError(400, 'Hero image must be a JPG, PNG, or WEBP image.'))
      return
    }
    callback(null, true)
  },
})

export const heroImageUpload: RequestHandler = (request, response, next) => {
  upload.single('heroImage')(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      next(new HttpError(400, error.code === 'LIMIT_FILE_SIZE'
        ? 'Hero images must be 5 MB or smaller.'
        : 'The hero image upload is invalid.'))
      return
    }
    next(error)
  })
}

export const getAdminStoreInformationController: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: { settings: await getAdminStoreInformation() } })
}

export const updateAdminStoreInformationController: RequestHandler = async (request, response) => {
  const fields = validateStoreInformationInput(request.body)
  const existingSettings = await getAdminStoreInformation()
  let uploadedImageUrl: string | undefined

  try {
    if (request.file) uploadedImageUrl = (await uploadHeroImage(request.file)).url
    const settings = await updateAdminStoreInformation({
      ...fields,
      heroImage: uploadedImageUrl ?? fields.heroImage ?? existingSettings?.heroImage ?? null,
    })
    if (uploadedImageUrl && existingSettings?.heroImage) await deleteHeroImage(existingSettings.heroImage)
    response.json({
      success: true,
      message: 'Store information updated.',
      data: { settings },
    })
  } catch (error: unknown) {
    if (uploadedImageUrl) await deleteHeroImage(uploadedImageUrl)
    throw error
  }
}

export const getAdminContactInformationController: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: { settings: await getAdminContactInformation() } })
}

export const updateAdminContactInformationController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Contact information updated.',
    data: { settings: await updateAdminContactInformation(validateContactInformationInput(request.body)) },
  })
}

export const getAdminPaymentSettingsController: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: { settings: await getAdminPaymentSettings() } })
}

export const updateAdminPaymentSettingsController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Payment settings updated.',
    data: { settings: await updateAdminPaymentSettings(validatePaymentSettingsInput(request.body)) },
  })
}

export const getPublicStoreSettingsController: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: await getPublicStoreSettings() })
}