import type { RequestHandler } from 'express'
import multer from 'multer'
import { HttpError } from '../../utils/http.js'
import {
  createBanner,
  deleteBanner,
  getAdminBanner,
  getPublicBanners,
  listAdminBanners,
  updateBanner,
  updateBannerStatus,
} from './banner.service.js'
import { deleteBannerImage, uploadBannerImage } from './banner.storage.js'
import { validateBannerId, validateBannerInput, validateBannerStatusInput } from './banner.validator.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, fieldSize: 1 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    const hasSupportedExtension = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.originalname)
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.mimetype) && !hasSupportedExtension) {
      callback(new HttpError(400, 'Banner image must be a JPG, PNG, WEBP, or HEIC/HEIF image.'))
      return
    }
    callback(null, true)
  },
})

export const bannerImageUpload: RequestHandler = (request, response, next) => {
  upload.single('image')(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      next(new HttpError(400, error.code === 'LIMIT_FILE_SIZE'
        ? 'Banner images must be 5 MB or smaller.'
        : 'The banner image upload is invalid.'))
      return
    }
    next(error)
  })
}

export const getPublicBannersController: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: { banners: await getPublicBanners() } })
}

export const listAdminBannersController: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: await listAdminBanners() })
}

export const getAdminBannerController: RequestHandler = async (request, response) => {
  response.json({ success: true, data: { banner: await getAdminBanner(validateBannerId(request.params.id)) } })
}

export const createAdminBannerController: RequestHandler = async (request, response) => {
  if (!request.file) throw new HttpError(400, 'A banner image is required.')
  let image: Awaited<ReturnType<typeof uploadBannerImage>> | undefined
  try {
    image = await uploadBannerImage(request.file)
    response.status(201).json({
      success: true,
      message: 'Banner created.',
      data: { banner: await createBanner(validateBannerInput(request.body), image) },
    })
  } catch (error: unknown) {
    if (image) await deleteBannerImage(image.publicId)
    throw error
  }
}

export const updateAdminBannerController: RequestHandler = async (request, response) => {
  const id = validateBannerId(request.params.id)
  const existingBanner = await getAdminBanner(id)
  let image: Awaited<ReturnType<typeof uploadBannerImage>> | undefined
  try {
    image = request.file ? await uploadBannerImage(request.file) : undefined
    const banner = await updateBanner(id, validateBannerInput(request.body), image)
    if (image && existingBanner.imagePublicId !== image.publicId) await deleteBannerImage(existingBanner.imagePublicId)
    response.json({ success: true, message: 'Banner updated.', data: { banner } })
  } catch (error: unknown) {
    if (image) await deleteBannerImage(image.publicId)
    throw error
  }
}

export const updateAdminBannerStatusController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Banner status updated.',
    data: { banner: await updateBannerStatus(validateBannerId(request.params.id), validateBannerStatusInput(request.body)) },
  })
}

export const deleteAdminBannerController: RequestHandler = async (request, response) => {
  const publicId = await deleteBanner(validateBannerId(request.params.id))
  const removed = await deleteBannerImage(publicId)
  if (!removed) console.warn(JSON.stringify({ event: 'banner_cloudinary_delete_failed', publicId }))
  response.json({ success: true, message: 'Banner deleted.' })
}