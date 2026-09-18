import { isValidE164PhoneNumber } from '../../../utils/phone'
import type { Product } from '../../../types/product'

export const MAX_LINES = 50
export const MAX_QUANTITY = 100000
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type FieldErrors = Record<string, string>

export interface QuoteLine {
  uid: string
  product: Product | null
  optionId: string | null
  quantity: string
  note: string
}

const makeRequestKey = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `qk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export { makeRequestKey }

export const validPhone = (value: string): boolean => isValidE164PhoneNumber(value)

export const readQuantityParam = (value: string | null): number => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_QUANTITY ? parsed : 1
}

let uidCounter = 0
const nextUid = (): string => `ql-${Date.now().toString(36)}-${(uidCounter += 1).toString(36)}`

export const newQuoteLine = (product: Product, optionId: string | null = null, quantity = '1'): QuoteLine => ({
  uid: nextUid(),
  product,
  optionId,
  quantity,
  note: '',
})

export const sortedOptions = (product: Product): NonNullable<Product['options']> =>
  product.options?.length
    ? [...product.options].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
    : []

export const initialOptionFor = (product: Product, preferredId: string | null): string | null => {
  const options = sortedOptions(product)
  if (options.length === 0) return null
  const preferred = options.find((option) => option.id === preferredId)
  if (preferred) return preferred.id
  return options.find((option) => option.stockQuantity > 0)?.id ?? options[0]?.id ?? null
}

export const productAlreadyAdded = (lines: QuoteLine[], product: Product): boolean =>
  lines.some((line) => line.product?.id === product.id)

export const countRequestedUnits = (lines: QuoteLine[]): number =>
  lines.reduce((total, line) => {
    const quantity = Number(line.quantity)
    return total + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0)
  }, 0)

export interface QuoteFormValues {
  customerName: string
  customerEmail: string
  customerPhone: string
  message: string
  lines: QuoteLine[]
  fulfillmentMethod: QuoteFulfillmentMethod
  delivery: DeliveryDraft
}

export type QuoteFulfillmentMethod = '' | 'PICKUP' | 'DELIVERY'

export interface DeliveryDraft {
  stateId: string
  city: string
  cityId: string
  area: string
  areaId: string
  address: string
}

export const emptyDeliveryDraft = (): DeliveryDraft => ({
  stateId: '',
  city: '',
  cityId: '',
  area: '',
  areaId: '',
  address: '',
})

export const validateQuoteForm = (values: QuoteFormValues): FieldErrors => {
  const nextErrors: FieldErrors = {}
  const { customerName, customerEmail, customerPhone, message, lines, fulfillmentMethod, delivery } = values

  if (customerName.trim().length === 0) nextErrors.name = 'Enter your full name.'
  else if (customerName.trim().length > 180) nextErrors.name = 'Name must be 180 characters or fewer.'

  const email = customerEmail.trim().toLowerCase()
  if (email.length === 0) nextErrors.email = 'Enter your email address.'
  else if (email.length > 255) nextErrors.email = 'Email must be 255 characters or fewer.'
  else if (!EMAIL_PATTERN.test(email)) nextErrors.email = 'Enter a valid email address.'

  if (customerPhone.trim().length === 0) nextErrors.phone = 'Enter your phone number.'
  else if (!validPhone(customerPhone)) nextErrors.phone = 'Enter a valid phone number.'

  if (message.length > 2000) nextErrors.message = 'Message must be 2,000 characters or fewer.'

  if (lines.length === 0) nextErrors.items = 'Add at least one product to your request.'

  if (fulfillmentMethod === '') {
    nextErrors.fulfillmentMethod = 'Choose pickup or delivery.'
  } else if (fulfillmentMethod === 'DELIVERY') {
    if (!delivery.stateId) nextErrors.state = 'Select your state.'
    if (!delivery.cityId) nextErrors.city = 'Select your city or LGA.'
    if (delivery.address.trim().length === 0) nextErrors.deliveryAddress = 'Enter your delivery address.'
    else if (delivery.address.trim().length > 500) {
      nextErrors.deliveryAddress = 'Delivery address must be 500 characters or fewer.'
    }
  }

  lines.forEach((line) => {
    const quantity = Number(line.quantity)
    if (!line.quantity.trim() || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      nextErrors[`line-${line.uid}-quantity`] = 'Quantity must be a whole number of at least 1.'
    }
    if ((line.product?.options?.length ?? 0) > 0 && !line.optionId) {
      nextErrors[`line-${line.uid}-option`] = 'Choose a quantity/size option for this product.'
    }
    if (line.note.length > 500) nextErrors[`line-${line.uid}-note`] = 'Item note must be 500 characters or fewer.'
  })

  return nextErrors
}