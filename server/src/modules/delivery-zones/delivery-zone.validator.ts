import { HttpError } from '../../utils/http.js'
import type { DeliveryZoneInput, ReorderDeliveryZonesInput } from './delivery-zone.types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateCityId(value: string | string[] | undefined): string {
  const id = Array.isArray(value) ? value[0] : value
  if (!id || !UUID_PATTERN.test(id.trim())) throw new HttpError(400, 'City ID is invalid.')
  return id.trim()
}

const cityIdValue = (value: unknown): string => {
  if (typeof value !== 'string') throw new HttpError(400, 'A city is required.')
  return validateCityId(value)
}

export function validateAssignZoneCityInput(body: unknown): { cityId: string } {
  if (!isRecord(body)) throw new HttpError(400, 'City data is required.')
  return { cityId: cityIdValue(body.cityId) }
}

export function validateDeliveryCityName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, 'A city is required to resolve the delivery zone.')
  }
  if (value.trim().length > 120) {
    throw new HttpError(400, 'City must be 120 characters or fewer.')
  }
  return value.trim()
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const booleanValue = (value: unknown, field: string, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  throw new HttpError(400, `${field} must be true or false.`)
}

const moneyValue = (value: unknown, field: string, opts: { required: boolean; allowZero: boolean }): number | null => {
  if (value === undefined || value === null || value === '') {
    if (opts.required) throw new HttpError(400, `${field} is required.`)
    return null
  }
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) throw new HttpError(400, `${field} must be a valid amount.`)
  const inKobo = Math.round(numeric * 100)
  if (opts.required && inKobo <= 0) throw new HttpError(400, `${field} must be greater than zero.`)
  if (!opts.required && inKobo < 0) throw new HttpError(400, `${field} must be zero or greater.`)
  return inKobo / 100
}

export function validateDeliveryZoneId(value: string | string[] | undefined): string {
  const id = Array.isArray(value) ? value[0] : value
  if (!id || !UUID_PATTERN.test(id.trim())) throw new HttpError(400, 'Delivery zone ID is invalid.')
  return id.trim()
}

export function validateDeliveryZoneInput(body: unknown): DeliveryZoneInput {
  if (!isRecord(body)) throw new HttpError(400, 'Delivery zone data is required.')
  const feeValue = moneyValue(body.fee, 'Delivery fee', { required: true, allowZero: false })
  if (feeValue === null) throw new HttpError(400, 'Delivery fee is required.')
  const freeDeliveryThreshold = moneyValue(body.freeDeliveryThreshold, 'Free delivery threshold', {
    required: false,
    allowZero: true,
  })
  if (freeDeliveryThreshold !== null && freeDeliveryThreshold !== 0 && freeDeliveryThreshold <= feeValue) {
    throw new HttpError(400, 'The free delivery threshold must be greater than the delivery fee.')
  }
  const cityIds = validateCityIds(body.cityIds)
  if (cityIds.length === 0) throw new HttpError(400, 'Add at least one city to this delivery zone.')
  return {
    fee: feeValue,
    freeDeliveryThreshold: freeDeliveryThreshold === 0 ? null : freeDeliveryThreshold,
    isActive: booleanValue(body.isActive, 'Delivery zone status', true),
    cityIds,
  }
}

function validateCityIds(value: unknown): string[] {
  if (!Array.isArray(value)) throw new HttpError(400, 'Cities are required.')
  const seen = new Set<string>()
  const validated: string[] = []
  for (const item of value) {
    const id = validateCityId(item)
    if (!seen.has(id)) {
      seen.add(id)
      validated.push(id)
    }
  }
  return validated
}

export function validateDeliveryZoneStatusInput(body: unknown): boolean {
  if (!isRecord(body)) throw new HttpError(400, 'Delivery zone status is required.')
  if (typeof body.isActive !== 'boolean' && body.isActive !== 'true' && body.isActive !== 'false') {
    throw new HttpError(400, 'Delivery zone status must be true or false.')
  }
  return booleanValue(body.isActive, 'Delivery zone status', false)
}

export function validateAdminDeliveryZonesQuery(query: Record<string, unknown>) {
  const page = Number(query.page ?? 1)
  const pageSize = Number(query.pageSize ?? 10)
  if (!Number.isInteger(page) || page < 1) throw new HttpError(400, 'Page must be a positive integer.')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new HttpError(400, 'Page size must be between 1 and 50.')
  }

  const status = query.status === 'active' || query.status === 'inactive'
    ? query.status
    : undefined
  if (query.status && !status) throw new HttpError(400, 'Delivery zone status filter is invalid.')

  return {
    page,
    pageSize,
    search: typeof query.search === 'string' ? query.search.trim().slice(0, 120) || undefined : undefined,
    status,
  } as const
}

export function validateReorderDeliveryZonesInput(body: unknown): ReorderDeliveryZonesInput {
  if (!isRecord(body)) throw new HttpError(400, 'Delivery zone order is required.')
  const zoneIds = body.zoneIds
  if (!Array.isArray(zoneIds) || zoneIds.length === 0) {
    throw new HttpError(400, 'At least one delivery zone is required to reorder.')
  }
  const seen = new Set<string>()
  const validated: string[] = []
  for (const item of zoneIds) {
    const id = validateDeliveryZoneId(item)
    if (seen.has(id)) throw new HttpError(400, 'Duplicate delivery zones in the order are not allowed.')
    seen.add(id)
    validated.push(id)
  }
  return { zoneIds: validated }
}