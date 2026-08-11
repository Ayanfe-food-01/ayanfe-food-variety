import type { RequestHandler } from 'express'
import {
  createCategory,
  deleteCategory,
  getAdminCategory,
  getCategories,
  listAdminCategories,
  updateCategory,
  updateCategoryStatus,
} from './category.service.js'
import {
  validateAdminCategoriesQuery,
  validateCategoryId,
  validateCategoryInput,
  validateCategoryStatusInput,
} from './category.validator.js'

export const getCategoriesController: RequestHandler = async (_request, response) => {
  const categories = await getCategories()
  response.json({ data: categories })
}

export const listAdminCategoriesController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: await listAdminCategories(validateAdminCategoriesQuery(request.query as Record<string, unknown>)),
  })
}

export const getAdminCategoryController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: { category: await getAdminCategory(validateCategoryId(request.params.id)) },
  })
}

export const createAdminCategoryController: RequestHandler = async (request, response) => {
  response.status(201).json({
    success: true,
    message: 'Category created.',
    data: { category: await createCategory(validateCategoryInput(request.body)) },
  })
}

export const updateAdminCategoryStatusController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Category status updated.',
    data: {
      category: await updateCategoryStatus(
        validateCategoryId(request.params.id),
        validateCategoryStatusInput(request.body),
      ),
    },
  })
}

export const updateAdminCategoryController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Category updated.',
    data: {
      category: await updateCategory(
        validateCategoryId(request.params.id),
        validateCategoryInput(request.body),
      ),
    },
  })
}

export const deleteAdminCategoryController: RequestHandler = async (request, response) => {
  await deleteCategory(validateCategoryId(request.params.id))
  response.json({ success: true, message: 'Category deleted.' })
}