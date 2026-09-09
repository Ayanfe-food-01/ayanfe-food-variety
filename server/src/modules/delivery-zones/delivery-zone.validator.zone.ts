import { HttpError } from '../../utils/http.js'
import { normalizeSearchQuery } from '../../utils/search.js'
import type { DeliveryZoneInput, ReorderDeliveryZonesInput } from './delivery-zone.types.js'
import { booleanValue, isRecord, moneyValue, positiveIntValue, validateId } from './delivery-zone.validator.common.js'

export function validateDeliveryZoneId(value: string | string[] | undefined): string {
  return validateId(value, 'Delivery zone ID')
}

export function validateCityIds(value: unknown): string[] {
  if (!Array.isArray(value)) throw new HttpError(400, 'Cities are required.')
  const seen = new Set<string>()
  const validated: string[] = []
  for (const item of value) {
    const id = validateId(item, 'City ID')
    if (!seen.has(id)) {
      seen.add(id)
      validated.push(id)
    }
  }
  return validated
}

// Area IDs are optional on the zone input (a zone may cover whole LGAs only);
// a missing field is treated as an empty list for backward compatibility. When
// present the value must be an array of valid area UUIDs.
export function validateAreaIds(value: unknown): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new HttpError(400, 'Areas must be a list.')
  const seen = new Set<string>()
  const validated: string[] = []
  for (const item of value) {
    const id = validateId(item, 'Delivery area ID')
    if (!seen.has(id)) {
      seen.add(id)
      validated.push(id)
    }
  }
  return validated
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
  const minDeliveryDays = positiveIntValue(body.minDeliveryDays, 'Minimum delivery days')
  const maxDeliveryDays = positiveIntValue(body.maxDeliveryDays, 'Maximum delivery days')
  if (minDeliveryDays !== null && maxDeliveryDays !== null && minDeliveryDays > maxDeliveryDays) {
    throw new HttpError(400, 'Minimum delivery days must not be greater than maximum delivery days.')
  }
  const cityIds = validateCityIds(body.cityIds)
  const areaIds = validateAreaIds(body.areaIds)
  if (cityIds.length === 0 && areaIds.length === 0) {
    throw new HttpError(400, 'Add at least one city or area to this delivery zone.')
  }
  return {
    fee: feeValue,
    freeDeliveryThreshold: freeDeliveryThreshold === 0 ? null : freeDeliveryThreshold,
    minDeliveryDays,
    maxDeliveryDays,
    isActive: booleanValue(body.isActive, 'Delivery zone status', true),
    cityIds,
    areaIds,
  }
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
    search: normalizeSearchQuery(query.search, 120),
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