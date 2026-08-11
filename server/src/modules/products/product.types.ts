export interface Product {
  id: string
  categoryId: string
  categoryName: string
  categorySlug: string
  name: string
  slug: string
  description: string
  price: string
  unit: string
  image: string
  isActive: boolean
  stockQuantity: number
  isAvailable: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminProductQuery {
  search?: string
  categoryId?: string
  availability?: 'active' | 'inactive' | 'out-of-stock'
  page: number
  pageSize: number
}

export interface ProductInput {
  name: string
  categoryId: string
  price: string
  unit: string
  description: string
  isActive: boolean
  stockQuantity: number
  image?: string
}