import { HttpError } from '../../utils/http.js'
import type { CategoryInput } from './category.types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const requiredText = (value: unknown, field: string, maxLength: number): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${field} is required.`)
  }
  if (value.trim().length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer.`)
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
  if (typeof body.isActive !== 'boolean' && body.isActive !== 'true' && body.isActive !== 'false') {
    throw new HttpError(400, 'Category status must be true or false.')
  }
  return booleanValue(body.isActive, 'Category status', false)
}

export function validateAdminCategoriesQuery(query: Record<string, unknown>) {
  const page = Number(query.page ?? 1)
  const pageSize = Number(query.pageSize ?? 10)
  if (!Number.isInteger(page) || page < 1) throw new HttpError(400, 'Page must be a positive integer.')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new HttpError(400, 'Page size must be between 1 and 50.')
  }

  const status = query.status === 'active' || query.status === 'inactive'
    ? query.status
    : undefined
  if (query.status && !status) throw new HttpError(400, 'Category status filter is invalid.')

  return {
    page,
    pageSize,
    search: typeof query.search === 'string' ? query.search.trim().slice(0, 120) || undefined : undefined,
    status,
  } as const
}