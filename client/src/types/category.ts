export interface Category {
  id: string
  name: string
  slug: string
  imageUrl: string
  imagePublicId?: string | null
  description: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  productCount?: number
}