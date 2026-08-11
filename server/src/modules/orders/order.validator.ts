import { HttpError } from '../../utils/http.js'
import type { CheckoutInput, CreateOrderInput, CreateOrderItemInput } from './order.types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const requiredText = (value: unknown, field: string, maxLength: number): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, `${field} is required`)
  }

  const normalizedValue = value.trim()
  if (normalizedValue.length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer`)
  }

  return normalizedValue
}

const optionalText = (value: unknown, field: string, maxLength: number): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} must be text`)
  }

  const normalizedValue = value.trim()
  if (normalizedValue.length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer`)
  }

  return normalizedValue || undefined
}

const validateItem = (value: unknown, index: number): CreateOrderItemInput => {
  if (!isRecord(value)) {
    throw new HttpError(400, `items[${index}] must be an object`)
  }

  const productId = value.productId
  if (typeof productId !== 'string' || !UUID_PATTERN.test(productId.trim())) {
    throw new HttpError(400, `items[${index}].productId must be a valid product ID`)
  }

  const quantity = value.quantity
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
    throw new HttpError(400, `items[${index}].quantity must be a positive integer`)
  }

  if (quantity > 1000) {
    throw new HttpError(400, `items[${index}].quantity is too large`)
  }

  return {
    productId: productId.trim(),
    quantity,
  }
}

export function validateCreateOrderInput(body: unknown): CreateOrderInput {
  if (!isRecord(body)) {
    throw new HttpError(400, 'Request body must be an object')
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new HttpError(400, 'At least one order item is required')
  }
  if (body.items.length > 50) {
    throw new HttpError(400, 'An order cannot contain more than 50 products')
  }

  const items = body.items.map(validateItem)
  const productIds = new Set<string>()
  for (const item of items) {
    if (productIds.has(item.productId)) {
      throw new HttpError(400, 'Duplicate products are not allowed in an order')
    }
    productIds.add(item.productId)
  }

  const email = optionalText(body.email, 'email', 255)
  if (email && !EMAIL_PATTERN.test(email)) {
    throw new HttpError(400, 'email must be a valid email address')
  }

  return {
    customerName: requiredText(body.customerName, 'customerName', 180),
    phone: requiredText(body.phone, 'phone', 40),
    whatsapp: optionalText(body.whatsapp, 'whatsapp', 40),
    email,
    deliveryAddress: requiredText(body.deliveryAddress, 'deliveryAddress', 2000),
    city: requiredText(body.city, 'city', 120),
    note: optionalText(body.note, 'note', 2000),
    items,
  }
}

export function validateOrderId(value: string | undefined): string {
  if (!value || !UUID_PATTERN.test(value.trim())) {
    throw new HttpError(400, 'order id must be a valid order ID')
  }

  return value.trim()
}

export function validateCheckoutInput(body: unknown): CheckoutInput {
  if (!isRecord(body)) throw new HttpError(400, 'Checkout details are required.')
  return {
    customerName: requiredText(body.customerName, 'customerName', 180),
    phone: requiredText(body.phone, 'phone', 40),
    deliveryAddress: requiredText(body.deliveryAddress, 'deliveryAddress', 2000),
    city: requiredText(body.city, 'city', 120),
    note: optionalText(body.note, 'note', 2000),
  }
}

export function validateOrderNumber(value: string | undefined): string {
  if (!value || !/^AFV-\d{4}-\d{6}$/.test(value.trim())) {
    throw new HttpError(400, 'Order number is invalid.')
  }
  return value.trim()
}