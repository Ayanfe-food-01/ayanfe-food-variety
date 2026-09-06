import type { RequestHandler } from 'express'
import multer from 'multer'
import { HttpError } from '../../utils/http.js'
import {
  createProduct,
  deleteProduct,
  getAdminProduct,
  listAdminProducts,
  updateProduct,
  updateProductFeatured,
  updateProductStatus,
  validateProductCategory,
} from './product.service.js'
import {
  validateAdminProductId,
  validateAdminProductsQuery,
  validateProductFeaturedInput,
  validateProductFields,
  validateProductImageOrder,
  validateProductStatusInput,
} from './product.validator.js'
import { deleteProductImage, deleteProductImageIfUnused, uploadProductImage } from './product.storage.js'

const routeParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10, fields: 20, fieldSize: 1 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    const hasSupportedExtension = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.originalname)
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.mimetype) && !hasSupportedExtension) {
      callback(new HttpError(400, 'Product image must be a JPG, PNG, WEBP, or HEIC/HEIF image.'))
      return
    }
    callback(null, true)
  },
})

export const productImageUpload: RequestHandler = (request, response, next) => {
  upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'image', maxCount: 1 },
  ])(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      next(new HttpError(400, error.code === 'LIMIT_FILE_SIZE'
        ? 'Product images must be 5 MB or smaller.'
        : error.code === 'LIMIT_FIELD_COUNT'
          ? 'Too many product form fields were submitted.'
          : error.code === 'LIMIT_UNEXPECTED_FILE'
            ? 'You can upload up to 10 product images.'
          : 'The product image upload is invalid.'))
      return
    }
    next(error)
  })
}

const uploadedProductFiles = (request: Parameters<RequestHandler>[0]): Express.Multer.File[] => {
  if (!request.files || Array.isArray(request.files)) return request.files ?? []
  return [...(request.files.images ?? []), ...(request.files.image ?? [])]
}

const resolveImageOrder = (
  order: string[] | null,
  existingImages: string[],
  uploadedImages: string[],
): string[] => {
  if (!order) return [...existingImages, ...uploadedImages]

  const existingSet = new Set(existingImages)
  const usedExisting = new Set<string>()
  const usedUploads = new Set<number>()
  const resolved: string[] = []

  for (const token of order) {
    if (token.startsWith('existing:')) {
      const url = token.slice('existing:'.length)
      if (!url || !existingSet.has(url) || usedExisting.has(url)) throw new HttpError(400, 'Product image order contains an invalid existing image.')
      usedExisting.add(url)
      resolved.push(url)
      continue
    }
    if (token.startsWith('new:')) {
      const index = Number(token.slice('new:'.length))
      if (!Number.isInteger(index) || index < 0 || index >= uploadedImages.length || usedUploads.has(index)) {
        throw new HttpError(400, 'Product image order contains an invalid new image.')
      }
      usedUploads.add(index)
      resolved.push(uploadedImages[index]!)
      continue
    }
    throw new HttpError(400, 'Product image order contains an invalid image.')
  }

  if (usedUploads.size !== uploadedImages.length) throw new HttpError(400, 'Every uploaded product image must have an order.')
  return resolved
}

export const listAdminProductsController: RequestHandler = async (request, response) => {
  response.json({ success: true, data: await listAdminProducts(validateAdminProductsQuery(request.query as Record<string, unknown>)) })
}

export const getAdminProductController: RequestHandler = async (request, response) => {
  response.json({ success: true, data: { product: await getAdminProduct(validateAdminProductId(routeParam(request.params.id))) } })
}

export const createAdminProductController: RequestHandler = async (request, response) => {
  const fields = validateProductFields(request.body)
  await validateProductCategory(fields.categoryId)
  const files = uploadedProductFiles(request)
  if (files.length === 0) throw new HttpError(400, 'At least one product image is required.')
  let uploadedImages: string[] = []
  try {
    uploadedImages = await Promise.all(files.map((file) => uploadProductImage(file)))
    const images = resolveImageOrder(validateProductImageOrder(request.body), [], uploadedImages)
    response.status(201).json({
      success: true,
      message: 'Product created.',
      data: { product: await createProduct({ ...fields, image: images[0], images }, request.authenticatedUser!.id) },
    })
  } catch (error: unknown) {
    // The image is uploaded before the transaction so the database never
    // contains a product that points at a failed upload. If persistence fails,
    // remove the newly uploaded asset to avoid orphaned Cloudinary files.
    await Promise.all(uploadedImages.map((image) => deleteProductImage(image)))
    throw error
  }
}

export const updateAdminProductController: RequestHandler = async (request, response) => {
  const productId = validateAdminProductId(routeParam(request.params.id))
  const fields = validateProductFields(request.body)
  await validateProductCategory(fields.categoryId)
  const existingProduct = await getAdminProduct(productId)
  const files = uploadedProductFiles(request)
  const existingImages = existingProduct.images.length > 0 ? existingProduct.images : [existingProduct.image].filter(Boolean)
  let uploadedImages: string[] = []
  let persisted = false
  try {
    uploadedImages = await Promise.all(files.map((file) => uploadProductImage(file)))
    const images = resolveImageOrder(validateProductImageOrder(request.body), existingImages, uploadedImages)
    if (images.length === 0) throw new HttpError(400, 'At least one product image is required.')
    const product = await updateProduct({ ...fields, image: images[0], images }, request.authenticatedUser!.id, productId)
    persisted = true
    const removedImages = existingImages.filter((image) => !images.includes(image))
    await Promise.allSettled(removedImages.map((image) => deleteProductImageIfUnused(image, productId)))
    response.json({
      success: true,
      message: 'Product updated.',
      data: { product },
    })
  } catch (error: unknown) {
    if (!persisted) await Promise.all(uploadedImages.map((image) => deleteProductImage(image)))
    throw error
  }
}

export const updateAdminProductStatusController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Product availability updated.',
    data: { product: await updateProductStatus(validateAdminProductId(routeParam(request.params.id)), validateProductStatusInput(request.body)) },
  })
}

export const updateAdminProductFeaturedController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Featured status updated.',
    data: { product: await updateProductFeatured(validateAdminProductId(routeParam(request.params.id)), validateProductFeaturedInput(request.body)) },
  })
}

export const deleteAdminProductController: RequestHandler = async (request, response) => {
  const deletedProduct = await deleteProduct(validateAdminProductId(routeParam(request.params.id)))
  const cleanupResults = await Promise.allSettled(deletedProduct.images.map((image) => deleteProductImageIfUnused(image)))
  if (cleanupResults.some((result) => result.status === 'rejected')) {
    console.warn(JSON.stringify({ event: 'product_cloudinary_delete_failed', productName: deletedProduct.name }))
  }
  response.json({ success: true, message: 'Product deleted.' })
}