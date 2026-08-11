export interface CartItemInput {
  productId: string
  quantity: number
}

export interface CustomerCartItemResponse {
  id: string
  productId: string
  name: string
  unit: string
  price: string
  image: string
  quantity: number
}