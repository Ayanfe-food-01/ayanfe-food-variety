import { Fragment, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../services/api'
import { CheckIcon, CloseIcon } from '../../assets/icons'
import { FeaturedToggle } from '../../components/admin/FeaturedToggle'
import { ImageUploadField } from '../../components/admin/ImageUploadField'
import { OptionInputField, type OptionRowErrors } from '../../components/admin/OptionInputField'
import { getSaveProgressLabel } from '../../components/admin/saveProgress'
import { SelectField } from '../../components/ui/SelectField'
import { SubmitButton } from '../../components/ui/SubmitButton'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
import { formatPrice } from '../../utils/formatPrice'
import { createAdminProduct, createAdminWholesalePackage, getAdminCategories, getAdminProduct, isFilledProductOption, updateAdminProduct, type ProductFormInput, type ProductOptionDraft } from '../../services/adminService'
import type { Category } from '../../types/category'

const MAX_PRODUCT_OPTIONS = 50

const ARCHIVED_PREFIX = 'Archived · '
const archivedDisplayLabel = (label: string): string => {
  let cleaned = label
  while (cleaned.startsWith(ARCHIVED_PREFIX)) cleaned = cleaned.slice(ARCHIVED_PREFIX.length)
  return cleaned
}

const initialForm: ProductFormInput = {
  name: '',
  categoryId: '',
  price: '',
  discountType: '',
  discountValue: '',
  deliveryFee: '0',
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

const FORM_STEPS = [
  { label: 'Basics', title: 'Basic information', hint: 'Name, category, unit and description.' },
  { label: 'Images', title: 'Product images', hint: 'Upload photos and set the display order.' },
  { label: 'Pricing & options', title: 'Pricing and sizes', hint: 'Price, stock, delivery and size options.' },
  { label: 'Review', title: 'Review and save', hint: 'Check the summary before publishing.' },
]

function ProductFormSkeleton({ isEditing }: { isEditing: boolean }) {
  const label = isEditing ? 'Loading product details' : 'Loading product form'
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}</span>
      <ol className="admin-product-form-steps flex items-center gap-2 sm:gap-3" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Fragment key={index}>
            <li className="flex min-w-0 flex-1 items-center justify-center">
              <span className="flex min-w-0 max-w-full items-center gap-2 rounded-full p-1.5 sm:py-1.5 sm:pl-1.5 sm:pr-3">
                <span className="size-7 shrink-0 rounded-full border-2 border-line bg-white" />
                <span className="admin-list-skeleton-block hidden h-3 w-16 sm:block" />
              </span>
            </li>
            {index < 3 && <span className="h-px w-3 shrink-0 bg-line sm:w-4" />}
          </Fragment>
        ))}
      </ol>
      <div className="space-y-3" aria-hidden="true">
        <span className="admin-list-skeleton-block h-6 w-48" />
        <span className="admin-list-skeleton-block h-3 max-w-sm" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2" aria-hidden="true">
        <span className="admin-list-skeleton-block h-12 w-full sm:col-span-2" />
        <span className="admin-list-skeleton-block h-12 w-full" />
        <span className="admin-list-skeleton-block h-12 w-full" />
        <span className="admin-list-skeleton-block h-16 w-full sm:col-span-2" />
      </div>
      <div className="flex items-center gap-3 border-t border-line pt-5" aria-hidden="true">
        <span className="admin-list-skeleton-block h-11 w-24" />
        <div className="flex-1" />
        <span className="admin-list-skeleton-block h-11 w-32" />
      </div>
    </div>
  )
}

interface ProductImageDraft {
  id: string
  url: string
  file?: File
}

type FormErrors = Partial<Record<'name' | 'categoryId' | 'price' | 'discountType' | 'discountValue' | 'deliveryFee' | 'unit' | 'description' | 'stockQuantity' | 'image', string>>

export function ProductForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState<ProductFormInput>(initialForm)
  const [archivedOptions, setArchivedOptions] = useState<ProductOptionDraft[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [imageDrafts, setImageDrafts] = useState<ProductImageDraft[]>([])
  const [isLoading, setIsLoading] = useState(isEditing)
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [optionErrors, setOptionErrors] = useState<OptionRowErrors[]>([])
  const [step, setStep] = useState(0)

  useInitialRouteLoad(!isLoading)

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
    getAdminProduct(id).then((product) => {
      const existingImages = product.images?.filter(Boolean).length ? product.images.filter(Boolean) : product.image ? [product.image] : []
      const loadedHasFilledOptions = (product.options ?? []).length > 0
      setForm({
        name: product.name,
        categoryId: product.categoryId ?? '',
        price: String(product.price),
        discountType: loadedHasFilledOptions ? '' : product.discountType ?? '',
        discountValue: loadedHasFilledOptions ? '' : product.discountValue === null ? '' : String(product.discountValue),
        deliveryFee: String(product.deliveryFee),
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
      setArchivedOptions((product.archivedOptions ?? []).map((option) => ({
        id: option.id,
        label: archivedDisplayLabel(option.label),
        price: String(option.price),
        stockQuantity: String(option.stockQuantity),
      })))
      setImageDrafts(existingImages.map((url, index) => ({ id: `existing-${index}-${url}`, url })))
    }).catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Product could not be loaded.')).finally(() => setIsLoading(false))
    return () => { current = false }
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

  const validOptionPrices = filledOptions.flatMap((option) => {
    const number = Number(option.price)
    return Number.isFinite(number) && number > 0 ? [number] : []
  })
  const derivedPrice = hasFilledOptions && validOptionPrices.length > 0 ? String(Math.min(...validOptionPrices)) : form.price
  const derivedStock = filledOptions.reduce((sum, option) => {
    const number = Number(option.stockQuantity)
    return sum + (Number.isInteger(number) && number >= 0 ? number : 0)
  }, 0)
  const categoryLabel = () => {
    const category = categories.find((candidate) => candidate.id === form.categoryId)
    return category ? (category.isActive ? category.name : `${category.name} (inactive)`) : ''
  }
  const selectedCategory = categoryLabel()

  const syncImageDrafts = (nextDrafts: ProductImageDraft[]) => {
    let newImageIndex = 0
    const imageOrder = nextDrafts.map((draft) => {
      if (draft.file) {
        const token = `new:${newImageIndex}`
        newImageIndex += 1
        return token
      }
      return `existing:${draft.url}`
    })
    setImageDrafts(nextDrafts)
    setForm((current) => ({
      ...current,
      images: nextDrafts.flatMap((draft) => draft.file ? [draft.file] : []),
      existingImages: nextDrafts.filter((draft) => !draft.file).map((draft) => draft.url),
      imageOrder,
    }))
    setFieldErrors((current) => ({ ...current, image: undefined }))
    setError(null)
  }

  const chooseImages = (files: File[], previews: string[], errorMessage: string | null) => {
    if (errorMessage) {
      setFieldErrors((current) => ({ ...current, image: errorMessage }))
      setError(null)
      return
    }
    syncImageDrafts([
      ...imageDrafts,
      ...files.map((file, index) => ({ id: `new-${Date.now()}-${index}`, url: previews[index], file })),
    ])
  }

  const removeImage = (index: number) => {
    const draft = imageDrafts[index]
    if (draft?.file) URL.revokeObjectURL(draft.url)
    syncImageDrafts(imageDrafts.filter((_, draftIndex) => draftIndex !== index))
  }

  const moveImage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= imageDrafts.length) return
    const nextDrafts = [...imageDrafts]
    ;[nextDrafts[index], nextDrafts[nextIndex]] = [nextDrafts[nextIndex], nextDrafts[index]]
    syncImageDrafts(nextDrafts)
  }

  const updateDiscountType = (value: string) => {
    if (value !== '' && value !== 'PERCENTAGE' && value !== 'FIXED') return
    update('discountType', value)
    if (!value) update('discountValue', '')
  }

  const validate = (): { fieldErrors: FormErrors; optionErrors: OptionRowErrors[] } => {
    const nextErrors: FormErrors = {}
    const optionErrors: OptionRowErrors[] = []
    const name = form.name.trim()
    const unit = form.unit.trim()
    const description = form.description.trim()
    const price = form.price.trim()
    const discountValue = form.discountValue.trim()
    const deliveryFee = form.deliveryFee.trim()
    const stock = Number(form.stockQuantity)
    const filledIndexes = form.options.map(isFilledProductOption)
    const hasFilledOptions = filledIndexes.length > 0 && filledIndexes.some(Boolean)

    if (name.length < 2 || name.length > 180) nextErrors.name = 'Use 2 to 180 characters.'
    if (!form.categoryId) nextErrors.categoryId = 'Select an active category.'
    else if (categories.find((category) => category.id === form.categoryId)?.isActive !== true) nextErrors.categoryId = 'Select an active category.'

    if (hasFilledOptions) {
      if (form.discountType || form.discountValue) nextErrors.discountType = 'Discounts cannot be combined with options.'
    } else {
      if (!/^\d+(?:\.\d{1,2})?$/.test(price) || Number(price) <= 0) nextErrors.price = 'Enter a price greater than zero with up to 2 decimals.'
      if (form.discountType && (!/^\d+(?:\.\d{1,2})?$/.test(discountValue) || Number(discountValue) <= 0)) {
        nextErrors.discountValue = 'Enter a discount greater than zero with up to 2 decimals.'
      } else if (form.discountType === 'PERCENTAGE' && Number(discountValue) > 100) {
        nextErrors.discountValue = 'Percentage discount cannot be greater than 100.'
      } else if (form.discountType === 'FIXED' && Number(discountValue) > Number(price)) {
        nextErrors.discountValue = 'Fixed discount cannot be greater than the product price.'
      }
      if (!Number.isInteger(stock) || stock < 0) nextErrors.stockQuantity = 'Enter a non-negative whole number.'
    }

    if (!/^\d+(?:\.\d{1,2})?$/.test(deliveryFee) || !Number.isFinite(Number(deliveryFee)) || Number(deliveryFee) < 0) nextErrors.deliveryFee = 'Enter a delivery fee of zero or more with up to 2 decimals.'
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
      if (!/^\d+(?:\.\d{1,2})?$/.test(optionPrice) || Number(optionPrice) <= 0) rowErrors.price = 'Enter a price greater than zero with up to 2 decimals.'
      if (optionStock !== '' && (!/^\d+$/.test(optionStock) || Number(optionStock) < 0)) rowErrors.stockQuantity = 'Enter a non-negative whole number.'
      const labelKey = label.toLowerCase()
      if (label && labels.has(labelKey)) rowErrors.label = 'Each option label must be unique.'
      if (label) labels.add(labelKey)
      optionErrors.push(rowErrors)
    })

    return { fieldErrors: nextErrors, optionErrors }
  }

  const errorsOnStep = (index: number, validation: { fieldErrors: FormErrors; optionErrors: OptionRowErrors[] }): boolean => {
    if (index === 0) return Boolean(validation.fieldErrors.name || validation.fieldErrors.categoryId || validation.fieldErrors.unit || validation.fieldErrors.description)
    if (index === 1) return Boolean(validation.fieldErrors.image)
    if (index === 2) return Boolean(validation.fieldErrors.price || validation.fieldErrors.discountType || validation.fieldErrors.discountValue || validation.fieldErrors.deliveryFee || validation.fieldErrors.stockQuantity || validation.optionErrors.some((errors) => Object.keys(errors).length > 0))
    return false
  }

  // Wholesale packages configured on options that did not exist yet (pending
  // drafts) are created once the product/options are persisted. The saved
  // options come back ordered by sortOrder, which matches the order of the
  // filled options sent to the API, so we map each pending option to the id of
  // the option that was just created for it.
  const persistPendingWholesalePackages = async (
    savedProductId: string,
    savedOptions: Array<{ id: string; sortOrder: number }>,
  ) => {
    const ordered = [...savedOptions].sort((a, b) => a.sortOrder - b.sortOrder)
    let filledPosition = 0
    for (const option of form.options) {
      if (!isFilledProductOption(option)) continue
      const savedOption = ordered[filledPosition]
      filledPosition += 1
      const pending = option.pendingPackages ?? []
      if (option.id || pending.length === 0 || !savedOption) continue
      await Promise.all(pending.map((pkg) => createAdminWholesalePackage(savedProductId, {
        productOptionId: savedOption.id,
        name: pkg.name,
        unitsPerPackage: pkg.unitsPerPackage,
        price: pkg.price,
        isActive: pkg.isActive,
      })))
    }
  }

  const save = async () => {
    setIsSaving(true)
    try {
      // The API performs the Cloudinary upload as part of this request.
      const saved = id ? await updateAdminProduct(id, form) : await createAdminProduct(form)
      try {
        await persistPendingWholesalePackages(saved.id, saved.options ?? [])
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

  const nextStep = () => {
    const validation = validate()
    setFieldErrors(validation.fieldErrors)
    setOptionErrors(validation.optionErrors)
    if (errorsOnStep(step, validation)) {
      setError('Please correct the highlighted fields before continuing.')
      return
    }
    setError(null)
    setStep((current) => Math.min(FORM_STEPS.length - 1, current + 1))
  }

  const previousStep = () => {
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
    if (step < FORM_STEPS.length - 1) {
      nextStep()
      return
    }
    setError(null)
    const validation = validate()
    const hasOptionErrors = validation.optionErrors.some((errors) => Object.keys(errors).length > 0)
    if (Object.keys(validation.fieldErrors).length > 0 || hasOptionErrors) {
      setFieldErrors(validation.fieldErrors)
      setOptionErrors(validation.optionErrors)
      const firstBadStep = FORM_STEPS.findIndex((_, index) => errorsOnStep(index, validation))
      setStep(firstBadStep === -1 ? FORM_STEPS.length - 1 : firstBadStep)
      setError('Please correct the highlighted fields.')
      return
    }
    await save()
  }

  const fieldProps = (field: keyof FormErrors) => ({
    'aria-invalid': Boolean(fieldErrors[field]),
    'aria-describedby': fieldErrors[field] ? `${field}-error` : undefined,
  })

  const progressLabel = getSaveProgressLabel(isEditing ? 'update' : 'create')

  const displayPrice = hasFilledOptions
    ? (validOptionPrices.length > 0 ? formatPrice(Math.min(...validOptionPrices)) : '—')
    : (form.price.trim() === '' ? '—' : Number.isFinite(Number(form.price)) && Number(form.price) > 0 ? formatPrice(Number(form.price)) : form.price.trim())
  const displayDeliveryFee = Number.isFinite(Number(form.deliveryFee)) ? formatPrice(Number(form.deliveryFee)) : form.deliveryFee.trim()
  const displayStock = hasFilledOptions ? String(derivedStock) : (form.stockQuantity.trim() === '' ? '0' : form.stockQuantity.trim())
  const displayDiscount = hasFilledOptions
    ? 'Not available with options'
    : (form.discountType === '' || form.discountValue.trim() === '' ? 'None' : form.discountType === 'PERCENTAGE' ? `${form.discountValue.trim()}% off` : formatPrice(Number(form.discountValue)))

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><Breadcrumb items={[{ label: 'Dashboard', href: '/admin' }, { label: 'Products', href: '/admin/products' }, { label: isEditing ? 'Edit product' : 'Add product' }]} /><p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-orange">Catalog</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">{isEditing ? 'Edit product' : 'Add product'}</h1><p className="mt-3 text-sm text-muted">{isEditing ? 'Update the product details and inventory level.' : 'Add a product customers can discover and purchase.'}</p></div>
      </div>
      <div className="mt-8 max-w-3xl rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
        {isLoading ? <ProductFormSkeleton isEditing={isEditing} /> : (
          <form className="space-y-6" noValidate onSubmit={submit}>
            <ol className="admin-product-form-steps flex items-center gap-2 sm:gap-3" aria-label="Product form steps">
              {FORM_STEPS.map((stepConfig, index) => {
                const isCurrent = index === step
                const isDone = index < step
                const isReached = index <= step
                return (
                  <Fragment key={stepConfig.label}>
                    <li className="flex min-w-0 flex-1 items-center justify-center">
                      <button
                        className={`flex min-w-0 max-w-full items-center gap-2 rounded-full p-1.5 transition-colors sm:py-1.5 sm:pl-1.5 sm:pr-3 ${isCurrent ? 'bg-sage/40' : isReached ? 'hover:bg-sage/25' : 'cursor-not-allowed opacity-50'}`}
                        type="button"
                        disabled={!isReached}
                        aria-current={isCurrent ? 'step' : undefined}
                        onClick={() => goToStep(index)}
                      >
                        <span
                          className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${isDone || isCurrent ? 'bg-green text-cream' : 'border-2 border-line bg-white text-muted'}`}
                          aria-hidden
                        >
                          {isDone ? <CheckIcon size={14} /> : index + 1}
                        </span>
                        <span className={`hidden min-w-0 truncate text-xs font-bold sm:inline ${isCurrent || isDone ? 'text-green-dark' : 'text-muted'}`}>{stepConfig.label}</span>
                      </button>
                    </li>
                    {index < FORM_STEPS.length - 1 && <span className="h-px w-3 shrink-0 bg-line sm:w-4" aria-hidden />}
                  </Fragment>
                )
              })}
            </ol>

            <div>
              <h2 className="text-xl font-bold tracking-[-0.02em] text-green-dark">{FORM_STEPS[step].title}</h2>
              <p className="mt-1 text-sm font-normal text-muted">{FORM_STEPS[step].hint}</p>
            </div>

            {error && <p className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm font-medium text-orange" role="alert">{error}</p>}

            {step === 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-bold text-green-dark sm:col-span-2">Product name<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" {...fieldProps('name')} value={form.name} onChange={(event) => update('name', event.target.value)} maxLength={180} required />{fieldErrors.name && <span className="mt-1 block text-xs font-normal text-orange" id="name-error">{fieldErrors.name}</span>}</label>
                <label className="text-sm font-bold text-green-dark">Category<SelectField
                  className="mt-2 w-full"
                  {...fieldProps('categoryId')}
                  disabled={isCategoriesLoading}
                  onChange={(value) => update('categoryId', value)}
                  options={[
                    { value: '', label: isCategoriesLoading ? 'Loading categories…' : 'Select category' },
                    ...categories.filter((category) => category.isActive).map((category) => ({ value: category.id, label: category.name })),
                  ]}
                  required
                  value={form.categoryId}
                />{fieldErrors.categoryId && <span className="mt-1 block text-xs font-normal text-orange" id="categoryId-error">{fieldErrors.categoryId}</span>}</label>
                <label className="text-sm font-bold text-green-dark">Unit / quantity<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" {...fieldProps('unit')} value={form.unit} onChange={(event) => update('unit', event.target.value)} maxLength={80} placeholder="5 kg bag" required />{fieldErrors.unit && <span className="mt-1 block text-xs font-normal text-orange" id="unit-error">{fieldErrors.unit}</span>}</label>
                <label className="text-sm font-bold text-green-dark sm:col-span-2">Description<textarea className="mt-2 min-h-32 w-full resize-y rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" {...fieldProps('description')} value={form.description} onChange={(event) => update('description', event.target.value)} maxLength={4000} required />{fieldErrors.description && <span className="mt-1 block text-xs font-normal text-orange" id="description-error">{fieldErrors.description}</span>}<span className="mt-1 block text-xs font-normal text-muted">{form.description.length}/4,000 characters</span></label>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <ImageUploadField
                  label="Product images"
                  helperText="Add up to 10 JPG, PNG, WEBP, or HEIC/HEIF images. The first image is the primary product image."
                  alt="Product image preview"
                  error={fieldErrors.image}
                  multiple
                  onChange={() => undefined}
                  onMultipleChange={chooseImages}
                />
                {imageDrafts.length > 0 && (
                  <div className="rounded-2xl border border-line bg-cream/40 p-4" aria-label="Product image order">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="m-0 text-sm font-bold text-green-dark">Image order</p>
                      <p className="m-0 text-xs text-muted">{imageDrafts.length}/10 images</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {imageDrafts.map((draft, index) => (
                        <div className="relative overflow-hidden rounded-xl border border-line bg-white" key={draft.id}>
                          <img className="aspect-square w-full object-cover" src={draft.url} alt={`${form.name || 'Product'} image ${index + 1}`} />
                          <button className="absolute right-1.5 top-1.5 z-10 grid size-6 place-items-center rounded-full border border-white/40 bg-green-dark/75 text-white shadow-sm transition-colors hover:bg-orange" type="button" aria-label={`Remove product image ${index + 1}`} onClick={() => removeImage(index)}><CloseIcon size={12} /></button>
                          <div className="flex items-center justify-between gap-1 border-t border-line p-2">
                            <span className="min-w-0 truncate text-[11px] font-bold text-green-dark">{index === 0 ? 'Primary' : `Image ${index + 1}`}</span>
                          </div>
                          <div className="flex gap-1 px-2 pb-2">
                            <button className="flex-1 rounded-md border border-line px-1 py-1 text-xs font-bold text-green-dark disabled:opacity-30" type="button" aria-label="Move image left" disabled={index === 0} onClick={() => moveImage(index, -1)}>←</button>
                            <button className="flex-1 rounded-md border border-line px-1 py-1 text-xs font-bold text-green-dark disabled:opacity-30" type="button" aria-label="Move image right" disabled={index === imageDrafts.length - 1} onClick={() => moveImage(index, 1)}>→</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-bold text-green-dark">Price (NGN){hasFilledOptions ? ' — from options' : ''}<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green disabled:cursor-not-allowed disabled:bg-cream" {...fieldProps('price')} type="text" inputMode="decimal" value={hasFilledOptions ? derivedPrice : form.price} disabled={hasFilledOptions} onChange={(event) => update('price', event.target.value)} placeholder="0.00" required={!hasFilledOptions} />{hasFilledOptions ? <span className="mt-1 block text-xs font-normal text-muted">Set to the lowest option price.</span> : fieldErrors.price && <span className="mt-1 block text-xs font-normal text-orange" id="price-error">{fieldErrors.price}</span>}</label>
                  <label className="text-sm font-bold text-green-dark">Stock quantity{hasFilledOptions ? ' — from options' : ''}<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green disabled:cursor-not-allowed disabled:bg-cream" {...fieldProps('stockQuantity')} type="number" min="0" step="1" value={hasFilledOptions ? String(derivedStock) : form.stockQuantity} disabled={hasFilledOptions} onChange={(event) => update('stockQuantity', event.target.value)} required={!hasFilledOptions} />{hasFilledOptions ? <span className="mt-1 block text-xs font-normal text-muted">Total stock is the sum of all option stock.</span> : fieldErrors.stockQuantity && <span className="mt-1 block text-xs font-normal text-orange" id="stockQuantity-error">{fieldErrors.stockQuantity}</span>}</label>
                  <label className="text-sm font-bold text-green-dark">Delivery fee (NGN)<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" {...fieldProps('deliveryFee')} type="text" inputMode="decimal" value={form.deliveryFee} onChange={(event) => update('deliveryFee', event.target.value)} placeholder="0.00" required />{fieldErrors.deliveryFee && <span className="mt-1 block text-xs font-normal text-orange" id="deliveryFee-error">{fieldErrors.deliveryFee}</span>}<span className="mt-1 block text-xs font-normal text-muted">Enter 0 for free delivery. The fee is charged per unit.</span></label>
                  {hasFilledOptions ? (
                    <div>
                      <p className="rounded-xl border border-dashed border-green/25 bg-sage/25 px-4 py-3 text-xs font-normal text-muted">Discounts are not available for products with quantity/size options.</p>
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-bold text-green-dark">Discount type (optional)<SelectField
                        className="mt-2 w-full"
                        {...fieldProps('discountType')}
                        onChange={updateDiscountType}
                        options={[
                          { value: '', label: 'No discount' },
                          { value: 'PERCENTAGE', label: 'Percentage discount' },
                          { value: 'FIXED', label: 'Fixed amount discount' },
                        ]}
                        value={form.discountType}
                      />{fieldErrors.discountType && <span className="mt-1 block text-xs font-normal text-orange" id="discountType-error">{fieldErrors.discountType}</span>}</label>
                      {form.discountType && <label className="mt-3 block text-sm font-bold text-green-dark">Discount value{form.discountType === 'PERCENTAGE' ? ' (%)' : ' (NGN)'}<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" {...fieldProps('discountValue')} type="text" inputMode="decimal" value={form.discountValue} onChange={(event) => update('discountValue', event.target.value)} placeholder={form.discountType === 'PERCENTAGE' ? '10' : '1000'} />{fieldErrors.discountValue && <span className="mt-1 block text-xs font-normal text-orange" id="discountValue-error">{fieldErrors.discountValue}</span>}</label>}
                      <p className="mt-2 text-xs font-normal text-muted">Discounts apply to the product price only. Delivery fees remain unchanged.</p>
                    </div>
                  )}
                </div>
                <OptionInputField
                  options={form.options}
                  errors={optionErrors}
                  maxOptions={MAX_PRODUCT_OPTIONS}
                  productId={id}
                  onChange={(nextOptions) => {
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
                  }}
                />
                {archivedOptions.length > 0 && (
                  <div className="rounded-2xl border border-line bg-cream/40 p-4">
                    <p className="m-0 text-sm font-bold text-green-dark">Previously removed sizes</p>
                    <p className="mt-1 text-xs font-normal text-muted">These sizes are still linked to past orders and customer carts, so they were kept rather than deleted. Restore one to sell it again — its details are filled from the last saved values.</p>
                    <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white">
                      {archivedOptions.map((option, index) => (
                        <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={option.id ?? `archived-${index}`}>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-green-dark">{option.label}</p>
                            <p className="mt-0.5 text-xs font-normal text-muted">{formatPrice(Number(option.price))} · {option.stockQuantity} in stock</p>
                          </div>
                          <button className="shrink-0 rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-green-dark hover:border-green disabled:cursor-not-allowed disabled:opacity-40" type="button" aria-label={`Restore option ${option.label}`} disabled={form.options.length >= MAX_PRODUCT_OPTIONS} onClick={() => restoreArchivedOption(index)}>Restore</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-line bg-cream/40 p-5 sm:p-6">
                  <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Product name</dt>
                      <dd className="mt-1 text-sm font-bold text-green-dark">{form.name.trim() || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Category</dt>
                      <dd className="mt-1 text-sm font-bold text-green-dark">{selectedCategory || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Unit / quantity</dt>
                      <dd className="mt-1 text-sm font-bold text-green-dark">{form.unit.trim() || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Delivery fee</dt>
                      <dd className="mt-1 text-sm font-bold text-green-dark">{displayDeliveryFee}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Price</dt>
                      <dd className="mt-1 text-sm font-bold text-green-dark">{displayPrice}</dd>
                      {hasFilledOptions && <dd className="mt-0.5 text-xs font-normal text-muted">Lowest of {filledOptions.length} option{filledOptions.length === 1 ? '' : 's'}.</dd>}
                    </div>
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Stock quantity</dt>
                      <dd className="mt-1 text-sm font-bold text-green-dark">{displayStock}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Discount</dt>
                      <dd className="mt-1 text-sm font-bold text-green-dark">{displayDiscount}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Product images</dt>
                      <dd className="mt-1 text-sm font-bold text-green-dark">{imageDrafts.length === 0 ? '—' : `${imageDrafts.length} image${imageDrafts.length === 1 ? '' : 's'}`}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Size options</dt>
                      <dd className="mt-1 text-sm font-bold text-green-dark">
                        {filledOptions.length === 0 ? 'None' : `${filledOptions.length} size option${filledOptions.length === 1 ? '' : 's'}`}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="space-y-4 border-t border-line pt-5">
                  <label className="flex items-center gap-3 text-sm font-bold text-green-dark"><input className="size-4 accent-green" type="checkbox" checked={form.isActive} onChange={(event) => update('isActive', event.target.checked)} />Available / active for sale</label>
                  <FeaturedToggle checked={form.isFeatured} disabled={isSaving} onChange={(checked) => update('isFeatured', checked)} />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-line pt-5 sm:gap-3">
              {step > 0 ? (
                <button className="min-w-0 flex-1 rounded-xl border border-line px-3 py-3 text-xs font-bold text-green-dark transition-colors hover:border-green sm:px-5 sm:text-sm" type="button" onClick={previousStep}>Back</button>
              ) : (
                <div className="flex-1" />
              )}
              {step < FORM_STEPS.length - 1 ? (
                <button className="min-w-0 flex-1 rounded-xl bg-green px-3 py-3 text-xs font-bold text-cream transition-colors hover:bg-green-dark sm:px-6 sm:text-sm" type="submit">Continue</button>
              ) : (
                <SubmitButton className="min-w-0 flex-1 px-3! py-3! text-xs! sm:px-6! sm:text-sm!" busy={isSaving} busyLabel={progressLabel} disabled={isCategoriesLoading}>{isEditing ? 'Save changes' : 'Create product'}</SubmitButton>
              )}
              <Link className="min-w-0 flex-1 rounded-xl border border-line px-3 py-3 text-center text-xs font-bold text-green-dark transition-colors hover:border-green sm:px-5 sm:text-sm" to="/admin/products">Cancel</Link>
            </div>
          </form>
        )}
      </div>
    </>
  )
}