import { HttpError } from '../../utils/http.js'
import { booleanValue, isRecord, UUID_PATTERN } from './delivery-zone.validator.common.js'
import type { DeliveryAreaInput } from './delivery-zone.types.js'

export function validateDeliveryAreaInput(body: unknown): DeliveryAreaInput {
  if (!isRecord(body)) throw new HttpError(400, 'Area data is required.')
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) throw new HttpError(400, 'Area name is required.')
  if (name.length > 120) throw new HttpError(400, 'Area name must be 120 characters or fewer.')
  const cityId = body.cityId
  if (typeof cityId !== 'string' || !UUID_PATTERN.test(cityId.trim())) {
    throw new HttpError(400, 'A valid city or LGA is required.')
  }
  return {
    cityId: cityId.trim(),
    name,
    isActive: booleanValue(body.isActive, 'Area status', true),
  }
}

export function validateDeliveryAreaUpdateInput(body: unknown): Omit<DeliveryAreaInput, 'cityId'> {
  if (!isRecord(body)) throw new HttpError(400, 'Area data is required.')
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) throw new HttpError(400, 'Area name is required.')
  if (name.length > 120) throw new HttpError(400, 'Area name must be 120 characters or fewer.')
  return {
    name,
    isActive: booleanValue(body.isActive, 'Area status', true),
  }
}

export function validateDeliveryAreaStatusInput(body: unknown): boolean {
  if (!isRecord(body)) throw new HttpError(400, 'Area status is required.')
  if (typeof body.isActive !== 'boolean' && body.isActive !== 'true' && body.isActive !== 'false') {
    throw new HttpError(400, 'Area status must be true or false.')
  }
  return booleanValue(body.isActive, 'Area status', false)
}