import { HttpError } from '../../utils/http.js'
import type { BannerInput } from './banner.types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const requiredText = (value: unknown, field: string, maxLength: number): string => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new HttpError(400, `${field} is required and must be ${maxLength} characters or fewer.`)
  }
  return value.trim()
}

const optionalText = (value: unknown, field: string, maxLength: number): string => {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer.`)
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

const displayOrderValue = (value: unknown): number => {
  if (value === undefined || value === '') return 0
  const order = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(order) || order < 0 || order > 999999) {
    throw new HttpError(400, 'Display order must be a whole number between 0 and 999999.')
  }
  return order
}

const destinationValue = (value: unknown): string => {
  const destination = optionalText(value, 'Destination', 500)
  if (!destination) return ''
  if (!destination.startsWith('/') || destination.startsWith('//') || destination.includes('\\') || /[\u0000-\u001f]/.test(destination)) {
    throw new HttpError(400, 'Destination must be a safe internal storefront path.')
  }
  return destination
}

export function validateBannerInput(body: unknown): BannerInput {
  if (!isRecord(body)) throw new HttpError(400, 'Banner data is required.')
  return {
    title: requiredText(body.title, 'Banner name', 180),
    promotionalText: optionalText(body.promotionalText, 'Promotional text', 500),
    buttonText: optionalText(body.buttonText, 'Button text', 120),
    destination: destinationValue(body.destination),
    isActive: booleanValue(body.isActive, 'Banner status', true),
    displayOrder: displayOrderValue(body.displayOrder),
  }
}

export function validateBannerId(value: string | string[] | undefined): string {
  const id = Array.isArray(value) ? value[0] : value
  if (!id || !UUID_PATTERN.test(id.trim())) throw new HttpError(400, 'Banner ID is invalid.')
  return id.trim()
}

export function validateBannerStatusInput(body: unknown): boolean {
  if (!isRecord(body)) throw new HttpError(400, 'Banner status is required.')
  return booleanValue(body.isActive, 'Banner status', false)
}