import type { Category } from '../../../types/category'
import { isFilledProductOption, type ProductFormInput } from '../../../services/adminService'
import type { OptionRowErrors } from '../../../components/admin/OptionInputField'
import type { FormErrors, ProductImageDraft } from './types'

export interface ValidateArgs {
  form: ProductFormInput
  categories: Category[]
  imageDrafts: ProductImageDraft[]
}

export interface ValidationResult {
  fieldErrors: FormErrors
  optionErrors: OptionRowErrors[]
}

export function validateProductForm({ form, categories, imageDrafts }: ValidateArgs): ValidationResult {
  const nextErrors: FormErrors = {}
  const optionErrors: OptionRowErrors[] = []
  const name = form.name.trim()
  const unit = form.unit.trim()
  const description = form.description.trim()
  const price = form.price.trim()
  const discountValue = form.discountValue.trim()
  const stock = Number(form.stockQuantity)
  const filledIndexes = form.options.map(isFilledProductOption)
  const hasFilledOptions = filledIndexes.length > 0 && filledIndexes.some(Boolean)

  if (name.length < 2 || name.length > 180) nextErrors.name = 'Use 2 to 180 characters.'
  if (!form.categoryId) nextErrors.categoryId = 'Select an active category.'
  else if (categories.find((category) => category.id === form.categoryId)?.isActive !== true) {
    nextErrors.categoryId = 'Select an active category.'
  }

  if (hasFilledOptions) {
    if (form.discountType || form.discountValue) nextErrors.discountType = 'Discounts cannot be combined with options.'
  } else {
    if (!/^\d+(?:\.\d{1,2})?$/.test(price) || Number(price) <= 0) {
      nextErrors.price = 'Enter a price greater than zero with up to 2 decimals.'
    }
    if (form.discountType && (!/^\d+(?:\.\d{1,2})?$/.test(discountValue) || Number(discountValue) <= 0)) {
      nextErrors.discountValue = 'Enter a discount greater than zero with up to 2 decimals.'
    } else if (form.discountType === 'PERCENTAGE' && Number(discountValue) > 100) {
      nextErrors.discountValue = 'Percentage discount cannot be greater than 100.'
    } else if (form.discountType === 'FIXED' && Number(discountValue) > Number(price)) {
      nextErrors.discountValue = 'Fixed discount cannot be greater than the product price.'
    }
    if (!Number.isInteger(stock) || stock < 0) nextErrors.stockQuantity = 'Enter a non-negative whole number.'
  }

  if (!unit || unit.length > 80) nextErrors.unit = 'Enter a unit using up to 80 characters.'
  if (description.length < 10 || description.length > 4000) nextErrors.description = 'Use 10 to 4,000 characters.'
  if (imageDrafts.length === 0) nextErrors.image = 'Select at least one product image.'

  const labels = new Set<string>()
  form.options.forEach((option, index) => {
    const rowErrors: OptionRowErrors = {}
    if (!filledIndexes[index]) {
      optionErrors.push(rowErrors)
      return
    }
    const label = option.label.trim()
    const optionPrice = option.price.trim()
    const optionStock = option.stockQuantity.trim()
    if (!label) rowErrors.label = 'Enter a label, for example 5 kg bag.'
    else if (label.length > 80) rowErrors.label = 'Use up to 80 characters.'
    if (!/^\d+(?:\.\d{1,2})?$/.test(optionPrice) || Number(optionPrice) <= 0) {
      rowErrors.price = 'Enter a price greater than zero with up to 2 decimals.'
    }
    if (optionStock !== '' && (!/^\d+$/.test(optionStock) || Number(optionStock) < 0)) {
      rowErrors.stockQuantity = 'Enter a non-negative whole number.'
    }
    const labelKey = label.toLowerCase()
    if (label && labels.has(labelKey)) rowErrors.label = 'Each option label must be unique.'
    if (label) labels.add(labelKey)
    optionErrors.push(rowErrors)
  })

  return { fieldErrors: nextErrors, optionErrors }
}

export function errorsOnStep(index: number, validation: ValidationResult): boolean {
  if (index === 0) {
    return Boolean(
      validation.fieldErrors.name ||
        validation.fieldErrors.categoryId ||
        validation.fieldErrors.unit ||
        validation.fieldErrors.description,
    )
  }
  if (index === 1) return Boolean(validation.fieldErrors.image)
  if (index === 2) {
    return Boolean(
      validation.fieldErrors.price ||
        validation.fieldErrors.discountType ||
        validation.fieldErrors.discountValue ||
        validation.fieldErrors.stockQuantity ||
        validation.optionErrors.some((errors) => Object.keys(errors).length > 0),
    )
  }
  return false
}