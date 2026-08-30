import type { RequestHandler } from 'express'
import multer from 'multer'
import { HttpError } from '../../utils/http.js'
import {
  createTestimonial,
  deleteTestimonial,
  getAdminTestimonial,
  listAdminTestimonials,
  updateTestimonial,
  updateTestimonialFeatured,
  updateTestimonialStatus,
} from './testimonial.service.js'
import {
  validateAdminTestimonialsQuery,
  validateTestimonialFeaturedInput,
  validateTestimonialId,
  validateTestimonialInput,
  validateTestimonialStatusInput,
} from './testimonial.validator.js'
import { deleteTestimonialAvatar, uploadTestimonialAvatar } from './testimonial.storage.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, fieldSize: 1 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    const hasSupportedExtension = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.originalname)
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.mimetype) && !hasSupportedExtension) {
      callback(new HttpError(400, 'Testimonial avatar must be a JPG, PNG, WEBP, or HEIC/HEIF image.'))
      return
    }
    callback(null, true)
  },
})

export const testimonialAvatarUpload: RequestHandler = (request, response, next) => {
  upload.single('avatar')(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      next(new HttpError(400, error.code === 'LIMIT_FILE_SIZE'
        ? 'Testimonial avatars must be 5 MB or smaller.'
        : 'The testimonial avatar upload is invalid.'))
      return
    }
    next(error)
  })
}

export const listAdminTestimonialsController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: await listAdminTestimonials(validateAdminTestimonialsQuery(request.query as Record<string, unknown>)),
  })
}

export const getAdminTestimonialController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: { testimonial: await getAdminTestimonial(validateTestimonialId(request.params.id)) },
  })
}

export const createAdminTestimonialController: RequestHandler = async (request, response) => {
  let avatar: Awaited<ReturnType<typeof uploadTestimonialAvatar>> | undefined
  try {
    avatar = request.file ? await uploadTestimonialAvatar(request.file) : undefined
    response.status(201).json({
      success: true,
      message: 'Testimonial created.',
      data: { testimonial: await createTestimonial(validateTestimonialInput(request.body), avatar) },
    })
  } catch (error: unknown) {
    if (avatar) await deleteTestimonialAvatar(avatar.publicId)
    throw error
  }
}

export const updateAdminTestimonialController: RequestHandler = async (request, response) => {
  const testimonialId = validateTestimonialId(request.params.id)
  const existing = await getAdminTestimonial(testimonialId)
  let avatar: Awaited<ReturnType<typeof uploadTestimonialAvatar>> | undefined
  try {
    avatar = request.file ? await uploadTestimonialAvatar(request.file) : undefined
    const testimonial = await updateTestimonial(testimonialId, validateTestimonialInput(request.body), avatar)
    if (avatar && existing.avatarPublicId && existing.avatarPublicId !== avatar.publicId) {
      await deleteTestimonialAvatar(existing.avatarPublicId)
    }
    response.json({ success: true, message: 'Testimonial updated.', data: { testimonial } })
  } catch (error: unknown) {
    if (avatar) await deleteTestimonialAvatar(avatar.publicId)
    throw error
  }
}

export const updateAdminTestimonialStatusController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Testimonial status updated.',
    data: {
      testimonial: await updateTestimonialStatus(
        validateTestimonialId(request.params.id),
        validateTestimonialStatusInput(request.body),
      ),
    },
  })
}

export const updateAdminTestimonialFeaturedController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Testimonial featured flag updated.',
    data: {
      testimonial: await updateTestimonialFeatured(
        validateTestimonialId(request.params.id),
        validateTestimonialFeaturedInput(request.body),
      ),
    },
  })
}

export const deleteAdminTestimonialController: RequestHandler = async (request, response) => {
  const deletedAvatarPublicId = await deleteTestimonial(validateTestimonialId(request.params.id))
  if (deletedAvatarPublicId) await deleteTestimonialAvatar(deletedAvatarPublicId)
  response.json({ success: true, message: 'Testimonial deleted.' })
}