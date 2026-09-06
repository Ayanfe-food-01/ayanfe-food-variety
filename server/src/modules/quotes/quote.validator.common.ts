import { HttpError } from '../../utils/http.js'

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const requiredText = (value: unknown, field: string, maxLength: number): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, `${field} is required.`)
  }

  const normalizedValue = value.trim()
  if (normalizedValue.length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer.`)
  }

  return normalizedValue
}

export const optionalText = (value: unknown, field: string, maxLength: number): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} must be text.`)
  }

  const normalizedValue = value.trim()
  if (normalizedValue.length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer.`)
  }

  return normalizedValue || undefined
}

export const requiredEmail = (value: unknown): string => {
  const email = requiredText(value, 'email', 255).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'A valid email address is required.')
  }
  return email
}

export const requiredPhone = (value: unknown): string => {
  const phone = requiredText(value, 'phone number', 40)
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) {
    throw new HttpError(400, 'Enter a valid phone number.')
  }
  return phone
}