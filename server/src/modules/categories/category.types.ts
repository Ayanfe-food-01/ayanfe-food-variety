export interface Category {
  id: string
  name: string
  slug: string
  description: string
  imageUrl: string
  imagePublicId?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  productCount?: number
}

export interface CategoryInput {
  name: string
  description: string
  isActive: boolean
}

export interface AdminCategoryQuery {
  page: number
  pageSize: number
  search?: string
  status?: 'active' | 'inactive'
}