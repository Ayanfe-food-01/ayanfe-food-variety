import type { RequestHandler } from 'express'
import { createCategory, getCategories, updateCategoryStatus } from './category.service.js'
import { validateCategoryId, validateCategoryInput, validateCategoryStatusInput } from './category.validator.js'

export const getCategoriesController: RequestHandler = async (_request, response) => {
  const categories = await getCategories()
  response.json({ data: categories })
}

export const listAdminCategoriesController: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: { categories: await getCategories(true) } })
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