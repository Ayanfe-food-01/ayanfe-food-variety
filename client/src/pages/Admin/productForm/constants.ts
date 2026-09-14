import type { ProductFormInput } from '../../../services/adminService'

export const MAX_PRODUCT_OPTIONS = 50

export const ARCHIVED_PREFIX = 'Archived · '

export const archivedDisplayLabel = (label: string): string => {
  let cleaned = label
  while (cleaned.startsWith(ARCHIVED_PREFIX)) cleaned = cleaned.slice(ARCHIVED_PREFIX.length)
  return cleaned
}

export const FORM_STEPS = [
  { label: 'Basics', title: 'Basic information', hint: 'Name, category, unit and description.' },
  { label: 'Images', title: 'Product images', hint: 'Upload photos and set the display order.' },
  { label: 'Pricing & options', title: 'Pricing and sizes', hint: 'Price, stock and size options.' },
  { label: 'Review', title: 'Review and save', hint: 'Check the summary before publishing.' },
] as const

export const LAST_STEP_INDEX = FORM_STEPS.length - 1

export const initialForm: ProductFormInput = {
  name: '',
  categoryId: '',
  price: '',
  discountType: '',
  discountValue: '',
  unit: '',
  description: '',
  stockQuantity: '0',
  isActive: true,
  isFeatured: false,
  images: [],
  existingImages: [],
  imageOrder: [],
  options: [],
}