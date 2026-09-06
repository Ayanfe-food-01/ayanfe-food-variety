import { FulfillmentMethod } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import type { PrepareQuotePricingInput } from './quote.types.js'
import { isRecord, UUID_PATTERN } from './quote.validator.common.js'

const MAX_ITEMS = 50
const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/
const MAX_UNIT_PRICE = 10_000_000
const MAX_DELIVERY_FEE = 10_000_000

const parseMoney = (value: unknown, field: string, max: number, options: { allowZero: boolean }): string => {
  const raw = typeof value === 'number'
    ? (Number.isFinite(value) ? String(value) : '')
    : typeof value === 'string' ? value.trim() : ''
  if (!MONEY_PATTERN.test(raw)) {
    throw new HttpError(400, `${field} must be a valid amount with at most two decimal places.`)
  }

  const amount = Number(raw)
  if (options.allowZero && amount === 0) return '0.00'
  if (!(amount > 0)) {
    throw new HttpError(400, `${field} must be greater than 0.`)
  }
  if (amount > max) {
    throw new HttpError(400, `${field} is too large.`)
  }
  return amount.toFixed(2)
}

export function validatePrepareQuotePricingInput(body: unknown): PrepareQuotePricingInput {
  if (!isRecord(body)) throw new HttpError(400, 'Quotation prices are required.')

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_ITEMS) {
    throw new HttpError(400, 'Provide a quoted price for every requested item.')
  }

  const seenItemIds = new Set<string>()
  const items = body.items.map((entry) => {
    if (!isRecord(entry) || typeof entry.itemId !== 'string' || !UUID_PATTERN.test(entry.itemId.trim())) {
      throw new HttpError(400, 'One or more quoted items are invalid.')
    }
    const itemId = entry.itemId.trim()
    if (seenItemIds.has(itemId)) {
      throw new HttpError(400, 'Each requested item may only be priced once.')
    }
    seenItemIds.add(itemId)

    return {
      itemId,
      quotedUnitPrice: parseMoney(entry.quotedUnitPrice, 'Quoted unit price', MAX_UNIT_PRICE, { allowZero: false }),
    }
  })

  const rawDeliveryFee = body.deliveryFee
  const deliveryFee = rawDeliveryFee === undefined || rawDeliveryFee === null || rawDeliveryFee === ''
    ? '0.00'
    : parseMoney(rawDeliveryFee, 'Delivery fee', MAX_DELIVERY_FEE, { allowZero: true })

  const fulfillmentMethod = body.fulfillmentMethod
  if (fulfillmentMethod !== FulfillmentMethod.PICKUP && fulfillmentMethod !== FulfillmentMethod.DELIVERY) {
    throw new HttpError(400, 'A valid fulfillment method is required.')
  }

  return { items, deliveryFee, fulfillmentMethod }
}