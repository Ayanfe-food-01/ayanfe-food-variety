import { ShoppingMode } from '@prisma/client'
import type { CustomerCartResponse } from './cart.types.js'
import { toCartResponse } from './cart.serializer.js'
import { getOrCreateCart } from './cart.primitives.js'

export { addCustomerCartItem, clearCustomerCart, removeCustomerCartItem, updateCustomerCartItem } from './cart.mutations.service.js'
export { mergeCustomerCart, replaceCustomerCart } from './cart.sync.service.js'
export type { CartItemInput, CustomerCartResponse } from './cart.types.js'

export async function getCustomerCart(userId: string, mode: ShoppingMode): Promise<CustomerCartResponse> {
  return toCartResponse(await getOrCreateCart(userId, mode))
}