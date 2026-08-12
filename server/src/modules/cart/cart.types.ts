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
  deliveryFee: string
  image: string
  quantity: number
  itemSubtotal: string
  isAvailable: boolean
  availableQuantity: number
  canUpdateQuantity: boolean
  availabilityMessage: string | null
}

export interface CustomerCartResponse {
  items: CustomerCartItemResponse[]
  subtotal: string
  deliveryFee: string
  totalQuantity: number
  canCheckout: boolean
}