import { request } from './api'
import type { Category } from '../types/category'

interface CategoryApiResponse {
  id: string
  name: string
  slug: string
  imageUrl: string
  description: string
  isActive: boolean
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
  imageUrl: category.imageUrl,
  description: category.description,
  isActive: category.isActive,
})

export async function getCategories(): Promise<Category[]> {
  const response = await request<CategoryListResponse>('/categories')
  return response.data.map(toCategory)
}