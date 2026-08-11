import { HttpError } from '../../utils/http.js'
import type { CategoryInput } from './category.types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const requiredText = (value: unknown, field: string, maxLength: number): string => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new HttpError(400, `${field} is required and must be valid.`)
  }
  return value.trim()
}

const optionalText = (value: unknown, field: string, maxLength: number): string => {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    throw new HttpError(400, `${field} must be valid.`)
  }
  return value.trim()
}

const booleanValue = (value: unknown, field: string, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  throw new HttpError(400, `${field} must be true or false.`)
}

export function validateCategoryInput(body: unknown): CategoryInput {
  if (!isRecord(body)) throw new HttpError(400, 'Category data is required.')
  return {
    name: requiredText(body.name, 'Category name', 120),
    description: optionalText(body.description, 'Category description', 500),
    isActive: booleanValue(body.isActive, 'Category status', true),
  }
}

export function validateCategoryId(value: string | string[] | undefined): string {
  const id = Array.isArray(value) ? value[0] : value
  if (!id || !UUID_PATTERN.test(id.trim())) throw new HttpError(400, 'Category ID is invalid.')
  return id.trim()
}

export function validateCategoryStatusInput(body: unknown): boolean {
  if (!isRecord(body)) throw new HttpError(400, 'Category status is required.')
  return booleanValue(body.isActive, 'Category status', false)
}