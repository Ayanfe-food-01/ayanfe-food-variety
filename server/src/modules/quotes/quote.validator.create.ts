import { HttpError } from '../../utils/http.js'
import type { CreateQuoteRequestInput } from './quote.types.js'
import { isRecord, optionalText, requiredEmail, requiredPhone, requiredText, UUID_PATTERN } from './quote.validator.common.js'

const MAX_ITEMS = 50
const MAX_QUANTITY = 100000
const MAX_MESSAGE_LENGTH = 2000

const validateRequestKey = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 64) {
    throw new HttpError(400, 'A valid request key is required.')
  }
  return value.trim()
}

const validateItems = (value: unknown): CreateQuoteRequestInput['items'] => {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ITEMS) {
    throw new HttpError(400, 'Add at least one product to your request.')
  }

  const seenKeys = new Set<string>()
  return value.map((item) => {
    if (!isRecord(item) || typeof item.productId !== 'string' || !UUID_PATTERN.test(item.productId.trim())) {
      throw new HttpError(400, 'One or more requested products are invalid.')
    }

    if (
      typeof item.quantity !== 'number'
      || !Number.isInteger(item.quantity)
      || item.quantity < 1
      || item.quantity > MAX_QUANTITY
    ) {
      throw new HttpError(400, 'Requested quantities must be positive whole numbers.')
    }

    let productOptionId: string | null = null
    if (item.productOptionId !== undefined && item.productOptionId !== null && item.productOptionId !== '') {
      if (typeof item.productOptionId !== 'string' || !UUID_PATTERN.test(item.productOptionId.trim())) {
        throw new HttpError(400, 'One or more requested product options are invalid.')
      }
      productOptionId = item.productOptionId.trim()
    }

    const dedupKey = `${item.productId.trim()}|${productOptionId ?? ''}`
    if (seenKeys.has(dedupKey)) {
      throw new HttpError(400, 'Each product may only appear once in a single request.')
    }
    seenKeys.add(dedupKey)

    const note = optionalText(item.note, 'item note', 500)

    return {
      productId: item.productId.trim(),
      productOptionId,
      quantity: item.quantity as number,
      note,
    }
  })
}

export function validateCreateQuoteRequestInput(body: unknown): CreateQuoteRequestInput {
  if (!isRecord(body)) throw new HttpError(400, 'Quote request details are required.')

  return {
    requestKey: validateRequestKey(body.requestKey),
    customerName: requiredText(body.customerName, 'Full name', 180),
    customerEmail: requiredEmail(body.customerEmail),
    customerPhone: requiredPhone(body.customerPhone),
    message: optionalText(body.message, 'message', MAX_MESSAGE_LENGTH),
    items: validateItems(body.items),
  }
}