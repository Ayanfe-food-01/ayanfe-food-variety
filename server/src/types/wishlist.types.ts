import type { PublicProduct } from './product.types.js'

export interface WishlistResponse {
  products: PublicProduct[]
  productIds: string[]
}