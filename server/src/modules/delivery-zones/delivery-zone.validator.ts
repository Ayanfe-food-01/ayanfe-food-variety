import { HttpError } from '../../utils/http.js'
import { isRecord, cityIdValue, validateId } from './delivery-zone.validator.common.js'

export { validateDeliveryAreaInput, validateDeliveryAreaUpdateInput, validateDeliveryAreaStatusInput } from './delivery-zone.validator.area.js'
export {
  validateDeliveryZoneId,
  validateDeliveryZoneInput,
  validateDeliveryZoneStatusInput,
  validateAdminDeliveryZonesQuery,
  validateReorderDeliveryZonesInput,
} from './delivery-zone.validator.zone.js'

export function validateCityId(value: string | string[] | undefined): string {
  return validateId(value, 'City ID')
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

export function validateDeliveryAreaId(value: string | string[] | undefined): string {
  return validateId(value, 'Delivery area ID')
}