import { HttpError } from '../../utils/http.js'
import type {
  CustomerAddressSaveInput,
  CustomerProfileUpdateInput,
} from './customer-account.types.js'

const PHONE_PATTERN = /^\+?[0-9][0-9\s().-]{5,19}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

type StringFieldConfig = { field: string; required: boolean; max: number }

const stringField = (
  value: unknown,
  config: StringFieldConfig,
): string | null | undefined => {
  if (value === undefined) {
    if (config.required) throw new HttpError(400, `${config.field} is required.`)
    return undefined
  }
  if (value === null) {
    if (config.required) throw new HttpError(400, `${config.field} is required.`)
    return null
  }
  const trimmed = typeof value === 'string' ? value.trim() : null
  if (!trimmed || trimmed.length === 0) {
    if (config.required) throw new HttpError(400, `${config.field} is required.`)
    return null
  }
  if (trimmed.length > config.max) {
    throw new HttpError(400, `${config.field} must be ${config.max} characters or fewer.`)
  }
  return trimmed
}

const optionalString = (
  value: unknown,
  config: { field: string; max: number },
): string | null => {
  if (value === undefined || value === null) return null
  const trimmed = typeof value === 'string' ? value.trim() : null
  if (!trimmed || trimmed.length === 0) return null
  if (trimmed.length > config.max) {
    throw new HttpError(400, `${config.field} must be ${config.max} characters or fewer.`)
  }
  return trimmed
}

const optionalUuid = (value: unknown, field: string): string | null => {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new HttpError(400, `${field} is invalid.`)
  }
  return value
}

export const validateCustomerAddressSaveInput = (
  input: unknown,
): CustomerAddressSaveInput => {
  if (!input || typeof input !== 'object') {
    throw new HttpError(400, 'Invalid address payload.')
  }
  const body = input as Record<string, unknown>

  const label = stringField(body.label, { field: 'Address label', required: true, max: 40 })
  const recipientName = stringField(body.recipientName, {
    field: 'Recipient name',
    required: true,
    max: 120,
  })
  const phone = stringField(body.phone, { field: 'Phone', required: true, max: 40 })
  if (typeof phone === 'string' && !PHONE_PATTERN.test(phone)) {
    throw new HttpError(400, 'Enter a valid phone number.')
  }
  const address = stringField(body.address, {
    field: 'Street address',
    required: true,
    max: 300,
  })
  const city = stringField(body.city, { field: 'City', required: true, max: 120 })
  const cityId = optionalUuid(body.cityId, 'City id')
  const state = optionalString(body.state, { field: 'State', max: 120 })
  const areaName = optionalString(body.areaName, { field: 'Area', max: 120 })
  const areaId = optionalUuid(body.areaId, 'Area id')
  const instructions = optionalString(body.instructions, {
    field: 'Delivery instructions',
    max: 1000,
  })
  const isDefault = typeof body.isDefault === 'boolean' ? body.isDefault : undefined

  if (
    typeof label !== 'string' ||
    typeof recipientName !== 'string' ||
    typeof phone !== 'string' ||
    typeof address !== 'string' ||
    typeof city !== 'string'
  ) {
    throw new HttpError(400, 'Address label, recipient name, phone, address, and city are required.')
  }

  return {
    label,
    recipientName,
    phone,
    address,
    city,
    cityId,
    state,
    areaName,
    areaId,
    instructions,
    isDefault,
  }
}

export const validateCustomerProfileUpdateInput = (
  input: unknown,
): CustomerProfileUpdateInput => {
  if (!input || typeof input !== 'object') {
    throw new HttpError(400, 'Invalid profile payload.')
  }
  const body = input as Record<string, unknown>

  const name = stringField(body.name, { field: 'Full name', required: false, max: 120 })
  const phone = stringField(body.phone, { field: 'Phone', required: false, max: 40 })
  if (typeof phone === 'string' && !PHONE_PATTERN.test(phone)) {
    throw new HttpError(400, 'Enter a valid phone number.')
  }

  return {
    name: typeof name === 'string' ? name : null,
    phone: typeof phone === 'string' ? phone : null,
  }
}


export const validateUuid = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw new HttpError(400, `${field} is invalid.`)
  }
  return value.trim()
}
