import type { PublicProduct } from '../products/product.types.js'

export interface WishlistResponse {
  products: PublicProduct[]
  productIds: string[]
}