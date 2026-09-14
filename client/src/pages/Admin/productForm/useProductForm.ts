import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../../services/api'
import {
  createAdminProduct,
  getAdminCategories,
  getAdminProduct,
  isFilledProductOption,
  updateAdminProduct,
  type ProductFormInput,
  type ProductOptionDraft,
} from '../../../services/adminService'
import type { Category } from '../../../types/category'
import type { OptionRowErrors } from '../../../components/admin/OptionInputField'
import { getSaveProgressLabel } from '../../../components/admin/saveProgress'
import { useInitialRouteLoad } from '../../../hooks/useInitialRouteLoad'
import { formatPrice } from '../../../utils/formatPrice'
import { archivedDisplayLabel, initialForm, LAST_STEP_INDEX, MAX_PRODUCT_OPTIONS } from './constants'
import { errorsOnStep, validateProductForm } from './validation'
import { persistPendingWholesalePackages } from './wholesalePackages'
import { useProductImages } from './useProductImages'
import type { FormErrors, ProductImageDraft } from './types'

export interface ProductFormController {
  isEditing: boolean
  isCategoriesLoading: boolean
  isSaving: boolean
  isLoading: boolean
  productId: string | undefined
  form: ProductFormInput
  categories: Category[]
  archivedOptions: ProductOptionDraft[]
  hasFilledOptions: boolean
  filledOptions: ProductOptionDraft[]
  derivedPrice: string
  derivedStock: number
  selectedCategory: string
  displayPrice: string
  displayStock: string
  displayDiscount: string
  imageDrafts: ProductImageDraft[]
  step: number
  isLastStep: boolean
  canGoBack: boolean
  error: string | null
  fieldErrors: FormErrors
  optionErrors: OptionRowErrors[]
  progressLabel: string
  fieldProps: (field: keyof FormErrors) => {
    'aria-invalid': boolean
    'aria-describedby': string | undefined
  }
  update: <Key extends keyof ProductFormInput>(field: Key, value: ProductFormInput[Key]) => void
  updateDiscountType: (value: string) => void
  updateOptions: (options: ProductOptionDraft[]) => void
  restoreArchivedOption: (index: number) => void
  chooseImages: (files: File[], previews: string[], errorMessage: string | null) => void
  removeImage: (index: number) => void
  moveImage: (index: number, direction: -1 | 1) => void
  next: () => void
  back: () => void
  goToStep: (index: number) => void
  submit: (event: FormEvent<HTMLFormElement>) => void
}

export function useProductForm(): ProductFormController {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState<ProductFormInput>(initialForm)
  const [archivedOptions, setArchivedOptions] = useState<ProductOptionDraft[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(isEditing)
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [optionErrors, setOptionErrors] = useState<OptionRowErrors[]>([])
  const [step, setStep] = useState(0)

  useInitialRouteLoad(!isLoading)

  const syncFormImages = (drafts: ProductImageDraft[], imageOrder: string[]) => {
    setForm((current) => ({
      ...current,
      images: drafts.flatMap((draft) => (draft.file ? [draft.file] : [])),
      existingImages: drafts.filter((draft) => !draft.file).map((draft) => draft.url),
      imageOrder,
    }))
    setError(null)
  }
  const clearImageError = () => setFieldErrors((current) => ({ ...current, image: undefined }))
  const reportImageError = (message: string) => setFieldErrors((current) => ({ ...current, image: message }))

  const images = useProductImages({ syncFormImages, clearImageError, reportImageError })

  const resetDraftsRef = useRef(images.resetDrafts)
  useEffect(() => {
    resetDraftsRef.current = images.resetDrafts
  })

  useEffect(() => {
    let current = true
    getAdminCategories()
      .then((loadedCategories) => {
        if (current) setCategories(loadedCategories)
      })
      .catch((caught: unknown) => {
        if (current) setError(caught instanceof ApiError ? caught.message : 'Categories could not be loaded.')
      })
      .finally(() => {
        if (current) setIsCategoriesLoading(false)
      })
    if (!id) return
    getAdminProduct(id)
      .then((product) => {
        const existingImages = product.images?.filter(Boolean).length
          ? product.images.filter(Boolean)
          : product.image
            ? [product.image]
            : []
        const loadedHasFilledOptions = (product.options ?? []).length > 0
        setForm({
          name: product.name,
          categoryId: product.categoryId ?? '',
          price: String(product.price),
          discountType: loadedHasFilledOptions ? '' : product.discountType ?? '',
          discountValue: loadedHasFilledOptions
            ? ''
            : product.discountValue === null
              ? ''
              : String(product.discountValue),
          unit: product.unit,
          description: product.description,
          stockQuantity: String(product.stockQuantity ?? 0),
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          images: [],
          existingImages,
          imageOrder: existingImages.map((image) => `existing:${image}`),
          options: (product.options ?? []).map((option) => ({
            id: option.id,
            label: option.label,
            price: String(option.price),
            stockQuantity: String(option.stockQuantity),
          })),
        })
        setArchivedOptions(
          (product.archivedOptions ?? []).map((option) => ({
            id: option.id,
            label: archivedDisplayLabel(option.label),
            price: String(option.price),
            stockQuantity: String(option.stockQuantity),
          })),
        )
        resetDraftsRef.current(existingImages.map((url, index) => ({ id: `existing-${index}-${url}`, url })))
      })
      .catch((caught: unknown) =>
        setError(caught instanceof ApiError ? caught.message : 'Product could not be loaded.'),
      )
      .finally(() => setIsLoading(false))
    return () => {
      current = false
    }
  }, [id])

  const update = <Key extends keyof ProductFormInput>(field: Key, value: ProductFormInput[Key]) => {
    setForm((current) => {
      const next = { ...current, [field]: value }
      if (next.options.some(isFilledProductOption) && (next.discountType || next.discountValue)) {
        next.discountType = ''
        next.discountValue = ''
      }
      return next
    })
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setError(null)
  }

  const filledOptions = form.options.filter(isFilledProductOption)
  const hasFilledOptions = filledOptions.length > 0

  const restoreArchivedOption = (index: number) => {
    const archived = archivedOptions[index]
    if (!archived || form.options.length >= MAX_PRODUCT_OPTIONS) return
    setArchivedOptions((current) => current.filter((_, currentIndex) => currentIndex !== index))
    setForm((current) => {
      const options = [...current.options, archived]
      const next = { ...current, options }
      if (options.some(isFilledProductOption) && (next.discountType || next.discountValue)) {
        next.discountType = ''
        next.discountValue = ''
      }
      return next
    })
    setOptionErrors((current) => [...current, {}])
    setError(null)
  }

  const updateOptions = (nextOptions: ProductOptionDraft[]) => {
    setForm((current) => {
      const next = { ...current, options: nextOptions }
      if (nextOptions.some(isFilledProductOption) && (next.discountType || next.discountValue)) {
        next.discountType = ''
        next.discountValue = ''
      }
      return next
    })
    setOptionErrors(nextOptions.map(() => ({})))
    setError(null)
  }

  const updateDiscountType = (value: string) => {
    if (value !== '' && value !== 'PERCENTAGE' && value !== 'FIXED') return
    update('discountType', value)
    if (!value) update('discountValue', '')
  }

  const validOptionPrices = filledOptions.flatMap((option) => {
    const number = Number(option.price)
    return Number.isFinite(number) && number > 0 ? [number] : []
  })
  const derivedPrice = hasFilledOptions && validOptionPrices.length > 0 ? String(Math.min(...validOptionPrices)) : form.price
  const derivedStock = filledOptions.reduce((sum, option) => {
    const number = Number(option.stockQuantity)
    return sum + (Number.isInteger(number) && number >= 0 ? number : 0)
  }, 0)

  const selectedCategory = (() => {
    const category = categories.find((candidate) => candidate.id === form.categoryId)
    return category ? (category.isActive ? category.name : `${category.name} (inactive)`) : ''
  })()

  const displayPrice = hasFilledOptions
    ? validOptionPrices.length > 0
      ? formatPrice(Math.min(...validOptionPrices))
      : '—'
    : form.price.trim() === ''
      ? '—'
      : Number.isFinite(Number(form.price)) && Number(form.price) > 0
        ? formatPrice(Number(form.price))
        : form.price.trim()
  const displayStock = hasFilledOptions ? String(derivedStock) : form.stockQuantity.trim() === '' ? '0' : form.stockQuantity.trim()
  const displayDiscount = hasFilledOptions
    ? 'Not available with options'
    : form.discountType === '' || form.discountValue.trim() === ''
      ? 'None'
      : form.discountType === 'PERCENTAGE'
        ? `${form.discountValue.trim()}% off`
        : formatPrice(Number(form.discountValue))

  const scrollToFirstError = () => {
    const firstInvalid = document.querySelector('#product-form [aria-invalid="true"]') as HTMLElement | null
    if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' })
    firstInvalid?.focus?.()
  }

  const save = async () => {
    setIsSaving(true)
    try {
      // The API performs the Cloudinary upload as part of this request.
      const saved = id ? await updateAdminProduct(id, form) : await createAdminProduct(form)
      try {
        await persistPendingWholesalePackages(form, saved.id, saved.options ?? [])
      } catch (caught: unknown) {
        console.error('Pending wholesale packages could not be created', caught)
      }
      navigate('/admin/products', {
        replace: true,
        state: { toast: { message: `Product ${isEditing ? 'updated' : 'created'} successfully.`, type: 'success' } },
      })
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Product could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  const next = () => {
    const validation = validateProductForm({ form, categories, imageDrafts: images.imageDrafts })
    setFieldErrors(validation.fieldErrors)
    setOptionErrors(validation.optionErrors)
    if (errorsOnStep(step, validation)) {
      setError('Please correct the highlighted fields before continuing.')
      return
    }
    setError(null)
    setStep((current) => Math.min(LAST_STEP_INDEX, current + 1))
  }

  const back = () => {
    setError(null)
    setStep((current) => Math.max(0, current - 1))
  }

  const goToStep = (index: number) => {
    if (index < 0 || index > step) return
    setError(null)
    setStep(index)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation = validateProductForm({ form, categories, imageDrafts: images.imageDrafts })
    const hasOptionErrors = validation.optionErrors.some((errors) => Object.keys(errors).length > 0)
    if (Object.keys(validation.fieldErrors).length > 0 || hasOptionErrors) {
      setFieldErrors(validation.fieldErrors)
      setOptionErrors(validation.optionErrors)
      setError('Please correct the highlighted fields before saving.')
      scrollToFirstError()
      return
    }
    setError(null)
    await save()
  }

  const fieldProps = (field: keyof FormErrors) => ({
    'aria-invalid': Boolean(fieldErrors[field]),
    'aria-describedby': fieldErrors[field] ? `${field}-error` : undefined,
  })

  const progressLabel = getSaveProgressLabel(isEditing ? 'update' : 'create')

  return {
    isEditing,
    isCategoriesLoading,
    isSaving,
    isLoading,
    productId: id,
    form,
    categories,
    archivedOptions,
    hasFilledOptions,
    filledOptions,
    derivedPrice,
    derivedStock,
    selectedCategory,
    displayPrice,
    displayStock,
    displayDiscount,
    imageDrafts: images.imageDrafts,
    step,
    isLastStep: step === LAST_STEP_INDEX,
    canGoBack: step > 0,
    error,
    fieldErrors,
    optionErrors,
    progressLabel,
    fieldProps,
    update,
    updateDiscountType,
    updateOptions,
    restoreArchivedOption,
    chooseImages: images.chooseImages,
    removeImage: images.removeImage,
    moveImage: images.moveImage,
    next,
    back,
    goToStep,
    submit,
  }
}