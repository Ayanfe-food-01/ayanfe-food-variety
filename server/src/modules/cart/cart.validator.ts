import { HttpError } from '../../utils/http.js'
import type { CartItemInput } from './cart.types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function validateCartItems(body: unknown): CartItemInput[] {
  if (!isRecord(body) || !Array.isArray(body.items) || body.items.length > 50) {
    throw new HttpError(400, 'Cart items are required and must be valid.')
  }

  const lineKeys = new Set<string>()
  return body.items.map((value, index) => {
    if (!isRecord(value)) throw new HttpError(400, `items[${index}] must be an object.`)
    if (typeof value.productId !== 'string' || !UUID_PATTERN.test(value.productId)) {
      throw new HttpError(400, `items[${index}].productId must be valid.`)
    }
    if (typeof value.quantity !== 'number' || !Number.isInteger(value.quantity) || value.quantity < 1 || value.quantity > 1000) {
      throw new HttpError(400, `items[${index}].quantity must be a positive integer.`)
    }
    const productOptionId = validateProductOptionId(value.productOptionId)
    const lineKey = `${value.productId}:${productOptionId ?? ''}`
    if (lineKeys.has(lineKey)) throw new HttpError(400, 'Duplicate products are not allowed in a cart.')
    lineKeys.add(lineKey)
    return { productId: value.productId, productOptionId, quantity: value.quantity }
  })
}

export function validateCartItemInput(body: unknown): CartItemInput {
  if (!isRecord(body)) throw new HttpError(400, 'A cart item is required.')
  if (typeof body.productId !== 'string' || !UUID_PATTERN.test(body.productId.trim())) {
    throw new HttpError(400, 'productId must be valid.')
  }
  return {
    productId: body.productId.trim(),
    productOptionId: validateProductOptionId(body.productOptionId),
    quantity: validateQuantity(body.quantity),
  }
}

export function validateProductOptionId(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw new HttpError(400, 'productOptionId must be valid.')
  }
  return value.trim()
}

export function validateQuantity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 1000) {
    throw new HttpError(400, 'Quantity must be a positive integer up to 1000.')
  }
  return value
}

export function validateCartItemId(value: string | undefined): string {
  if (!value || !UUID_PATTERN.test(value.trim())) throw new HttpError(400, 'Cart item ID is invalid.')
  return value.trim()
}