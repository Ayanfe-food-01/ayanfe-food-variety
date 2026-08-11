import { HttpError } from '../../utils/http.js'
import type {
  UpdateContactInformationInput,
  UpdateStoreInformationInput,
} from './settings.types.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const requiredText = (value: unknown, field: string, maxLength: number): string => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new HttpError(400, `${field} is required and must be ${maxLength} characters or fewer.`)
  }
  return value.trim()
}

const optionalText = (value: unknown, field: string, maxLength: number): string => {
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer.`)
  }
  return value.trim()
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^\+?[0-9][0-9\s().-]{6,38}$/

const validatePhone = (value: unknown, field: string): string => {
  const phone = requiredText(value, field, 40)
  if (!phonePattern.test(phone)) throw new HttpError(400, `${field} must be a valid phone number.`)
  return phone
}

export function validateStoreInformationInput(body: unknown): UpdateStoreInformationInput {
  if (!isRecord(body)) throw new HttpError(400, 'Store information is required.')
  return {
    businessName: requiredText(body.businessName, 'Business name', 180),
    address: optionalText(body.address, 'Business address', 500),
    description: optionalText(body.description, 'Business description', 500),
  }
}

export function validateContactInformationInput(body: unknown): UpdateContactInformationInput {
  if (!isRecord(body)) throw new HttpError(400, 'Contact information is required.')
  const businessEmail = requiredText(body.businessEmail, 'Business email', 255)
  if (!emailPattern.test(businessEmail)) throw new HttpError(400, 'Business email must be valid.')
  return {
    businessEmail,
    businessPhone: validatePhone(body.businessPhone, 'Business phone'),
    whatsappNumber: validatePhone(body.whatsappNumber, 'WhatsApp number'),
  }
}