import { HttpError } from '../../utils/http.js'

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const validateId = (value: string | string[] | undefined, field: string): string => {
  const id = Array.isArray(value) ? value[0] : value
  if (!id || !UUID_PATTERN.test(id.trim())) throw new HttpError(400, `${field} is invalid.`)
  return id.trim()
}

export const booleanValue = (value: unknown, field: string, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  throw new HttpError(400, `${field} must be true or false.`)
}

export const moneyValue = (value: unknown, field: string, opts: { required: boolean; allowZero: boolean }): number | null => {
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

export const positiveIntValue = (value: unknown, field: string): number | null => {
  if (value === undefined || value === null || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
    throw new HttpError(400, `${field} must be a whole number.`)
  }
  if (numeric < 1) throw new HttpError(400, `${field} must be at least 1.`)
  return numeric
}

export const cityIdValue = (value: unknown): string => {
  if (typeof value !== 'string') throw new HttpError(400, 'A city is required.')
  return validateId(value, 'City ID')
}