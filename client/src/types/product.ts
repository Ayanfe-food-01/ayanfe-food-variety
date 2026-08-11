export interface Product {
  id: string
  name: string
  category: string
  unit: string
  price: number
  image: string
  description: string
  categoryId?: string
  stockQuantity?: number
  isActive: boolean
  isAvailable: boolean
  availabilityStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  createdAt?: string
  updatedAt?: string
}