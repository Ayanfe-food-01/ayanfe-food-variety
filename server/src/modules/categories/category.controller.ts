import type { RequestHandler } from 'express'
import { getCategories } from './category.service.js'

export const getCategoriesController: RequestHandler = async (_request, response) => {
  const categories = await getCategories()
  response.json({ data: categories })
}