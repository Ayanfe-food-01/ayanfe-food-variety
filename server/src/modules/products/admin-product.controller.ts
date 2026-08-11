import type { RequestHandler } from 'express'
import multer from 'multer'
import { HttpError } from '../../utils/http.js'
import {
  createProduct,
  getAdminProduct,
  listAdminProducts,
  updateProduct,
  updateProductStatus,
  validateProductCategory,
} from './product.service.js'
import {
  validateAdminProductId,
  validateAdminProductsQuery,
  validateProductFields,
  validateProductInput,
  validateProductStatusInput,
} from './product.validator.js'
import { uploadProductImage } from './product.storage.js'

const routeParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, fieldSize: 1 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new HttpError(400, 'Product image must be a JPG, PNG, or WEBP image.'))
      return
    }
    callback(null, true)
  },
})

export const productImageUpload: RequestHandler = (request, response, next) => {
  upload.single('image')(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      next(new HttpError(400, error.code === 'LIMIT_FILE_SIZE'
        ? 'Product images must be 5 MB or smaller.'
        : 'The product image upload is invalid.'))
      return
    }
    next(error)
  })
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
  if (!request.file) throw new HttpError(400, 'A product image is required.')
  const image = request.file ? await uploadProductImage(request.file) : undefined
  response.status(201).json({
    success: true,
    message: 'Product created.',
    data: { product: await createProduct({ ...fields, image }, request.authenticatedUser!.id) },
  })
}

export const updateAdminProductController: RequestHandler = async (request, response) => {
  const image = request.file ? await uploadProductImage(request.file) : undefined
  response.json({
    success: true,
    message: 'Product updated.',
    data: { product: await updateProduct(validateAdminProductId(routeParam(request.params.id)), validateProductInput(request.body, image, true), request.authenticatedUser!.id) },
  })
}

export const updateAdminProductStatusController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Product availability updated.',
    data: { product: await updateProductStatus(validateAdminProductId(routeParam(request.params.id)), validateProductStatusInput(request.body)) },
  })
}