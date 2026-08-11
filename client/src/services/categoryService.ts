import { request } from './api'
import type { Category } from '../types/category'

interface CategoryApiResponse {
  id: string
  name: string
  slug: string
  image: string
  createdAt: string
  updatedAt: string
}

interface CategoryListResponse {
  data: CategoryApiResponse[]
}

const toCategory = (category: CategoryApiResponse): Category => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
  image: category.image,
})

export async function getCategories(): Promise<Category[]> {
  const response = await request<CategoryListResponse>('/categories')
  return response.data.map(toCategory)
}