import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../services/api'
import { FeaturedToggle } from '../../components/admin/FeaturedToggle'
import { ImageUploadField } from '../../components/admin/ImageUploadField'
import { OptionInputField, type OptionRowErrors } from '../../components/admin/OptionInputField'
import { getSaveProgressLabel } from '../../components/admin/saveProgress'
import { SelectField } from '../../components/ui/SelectField'
import { SubmitButton } from '../../components/ui/SubmitButton'
import { formatPrice } from '../../utils/formatPrice'
import { createAdminProduct, getAdminCategories, getAdminProduct, isFilledProductOption, updateAdminProduct, type ProductFormInput, type ProductOptionDraft } from '../../services/adminService'
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
      setForm({
        name: product.name,
        categoryId: product.categoryId ?? '',
        price: String(product.price),
        discountType: product.discountType ?? '',
        discountValue: product.discountValue === null ? '' : String(product.discountValue),
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
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setError(null)
  }

  const filledOptions = form.options.filter(isFilledProductOption)
  const hasFilledOptions = filledOptions.length > 0

  const restoreArchivedOption = (index: number) => {
    const archived = archivedOptions[index]
    if (!archived || form.options.length >= MAX_PRODUCT_OPTIONS) return
    setArchivedOptions((current) => current.filter((_, currentIndex) => currentIndex !== index))
    setForm((current) => ({ ...current, options: [...current.options, archived] }))
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

  useEffect(() => {
    if (hasFilledOptions && (form.discountType || form.discountValue)) {
      setForm((current) => ({ ...current, discountType: '', discountValue: '' }))
    }
  }, [hasFilledOptions, form.discountType, form.discountValue])

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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const validation = validate()
    const hasOptionErrors = validation.optionErrors.some((errors) => Object.keys(errors).length > 0)
    if (Object.keys(validation.fieldErrors).length > 0 || hasOptionErrors) {
      setFieldErrors(validation.fieldErrors)
      setOptionErrors(validation.optionErrors)
      setError('Please correct the highlighted fields.')
      return
    }
    setIsSaving(true)
    try {
      // The API performs the Cloudinary upload as part of this request.
      if (id) await updateAdminProduct(id, form)
      else await createAdminProduct(form)
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

  const fieldProps = (field: keyof FormErrors) => ({
    'aria-invalid': Boolean(fieldErrors[field]),
    'aria-describedby': fieldErrors[field] ? `${field}-error` : undefined,
  })

  const progressLabel = getSaveProgressLabel(isEditing ? 'update' : 'create')

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Catalog</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">{isEditing ? 'Edit product' : 'Add product'}</h1><p className="mt-3 text-sm text-muted">{isEditing ? 'Update the product details and inventory level.' : 'Add a product customers can discover and purchase.'}</p></div>
        <Link className="text-sm font-bold text-green hover:text-orange" to="/admin/products">Back to products</Link>
      </div>
      <div className="mt-8 max-w-3xl rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
        {isLoading ? <p className="text-sm text-muted">Loading product…</p> : <form className="space-y-5" noValidate onSubmit={submit}>
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
             <label className="text-sm font-bold text-green-dark">Price (NGN){hasFilledOptions ? ' — from options' : ''}<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green disabled:cursor-not-allowed disabled:bg-cream" {...fieldProps('price')} type="text" inputMode="decimal" value={hasFilledOptions ? derivedPrice : form.price} disabled={hasFilledOptions} onChange={(event) => update('price', event.target.value)} placeholder="0.00" required={!hasFilledOptions} />{hasFilledOptions ? <span className="mt-1 block text-xs font-normal text-muted">Set to the lowest option price.</span> : fieldErrors.price && <span className="mt-1 block text-xs font-normal text-orange" id="price-error">{fieldErrors.price}</span>}</label>
             <div className="sm:col-span-2">
               {hasFilledOptions ? (
                 <p className="rounded-xl border border-dashed border-green/25 bg-sage/25 px-4 py-3 text-xs font-normal text-muted">Discounts are not available for products with quantity/size options.</p>
               ) : (
                 <div className="grid gap-5 sm:grid-cols-2">
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
                  {form.discountType && <label className="text-sm font-bold text-green-dark">Discount value{form.discountType === 'PERCENTAGE' ? ' (%)' : ' (NGN)'}<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" {...fieldProps('discountValue')} type="text" inputMode="decimal" value={form.discountValue} onChange={(event) => update('discountValue', event.target.value)} placeholder={form.discountType === 'PERCENTAGE' ? '10' : '1000'} />{fieldErrors.discountValue && <span className="mt-1 block text-xs font-normal text-orange" id="discountValue-error">{fieldErrors.discountValue}</span>}</label>}
                 </div>
               )}
               {!hasFilledOptions && <p className="mt-2 text-xs font-normal text-muted">Discounts apply to the product price only. Delivery fees remain unchanged.</p>}
             </div>
             <label className="text-sm font-bold text-green-dark">Delivery fee (NGN)<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" {...fieldProps('deliveryFee')} type="text" inputMode="decimal" value={form.deliveryFee} onChange={(event) => update('deliveryFee', event.target.value)} placeholder="0.00" required />{fieldErrors.deliveryFee && <span className="mt-1 block text-xs font-normal text-orange" id="deliveryFee-error">{fieldErrors.deliveryFee}</span>}<span className="mt-1 block text-xs font-normal text-muted">Enter 0 for free delivery. The fee is charged per unit.</span></label>
            <label className="text-sm font-bold text-green-dark">Unit / quantity<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" {...fieldProps('unit')} value={form.unit} onChange={(event) => update('unit', event.target.value)} maxLength={80} placeholder="5 kg bag" required />{fieldErrors.unit && <span className="mt-1 block text-xs font-normal text-orange" id="unit-error">{fieldErrors.unit}</span>}</label>
            <label className="text-sm font-bold text-green-dark">Stock quantity{hasFilledOptions ? ' — from options' : ''}<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green disabled:cursor-not-allowed disabled:bg-cream" {...fieldProps('stockQuantity')} type="number" min="0" step="1" value={hasFilledOptions ? String(derivedStock) : form.stockQuantity} disabled={hasFilledOptions} onChange={(event) => update('stockQuantity', event.target.value)} required={!hasFilledOptions} />{hasFilledOptions ? <span className="mt-1 block text-xs font-normal text-muted">Total stock is the sum of all option stock.</span> : fieldErrors.stockQuantity && <span className="mt-1 block text-xs font-normal text-orange" id="stockQuantity-error">{fieldErrors.stockQuantity}</span>}</label>
          </div>
          <OptionInputField
            options={form.options}
            errors={optionErrors}
            maxOptions={MAX_PRODUCT_OPTIONS}
            onChange={(nextOptions) => {
              setForm((current) => ({ ...current, options: nextOptions }))
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
          <label className="block text-sm font-bold text-green-dark">Description<textarea className="mt-2 min-h-32 w-full resize-y rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" {...fieldProps('description')} value={form.description} onChange={(event) => update('description', event.target.value)} maxLength={4000} required />{fieldErrors.description && <span className="mt-1 block text-xs font-normal text-orange" id="description-error">{fieldErrors.description}</span>}<span className="mt-1 block text-xs font-normal text-muted">{form.description.length}/4,000 characters</span></label>
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
                      <div className="flex items-center justify-between gap-1 border-t border-line p-2">
                        <span className="min-w-0 truncate text-[11px] font-bold text-green-dark">{index === 0 ? 'Primary' : `Image ${index + 1}`}</span>
                        <button className="text-xs font-bold text-orange hover:text-green-dark" type="button" onClick={() => removeImage(index)}>Remove</button>
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
          <label className="flex items-center gap-3 text-sm font-bold text-green-dark"><input className="size-4 accent-green" type="checkbox" checked={form.isActive} onChange={(event) => update('isActive', event.target.checked)} />Available / active for sale</label>
             <FeaturedToggle checked={form.isFeatured} disabled={isSaving} onChange={(checked) => update('isFeatured', checked)} />
          {error && <p className="text-sm font-medium text-orange" role="alert">{error}</p>}
           <div className="flex flex-wrap gap-3"><SubmitButton busy={isSaving} busyLabel={progressLabel} disabled={isCategoriesLoading}>{isEditing ? 'Save changes' : 'Create product'}</SubmitButton><Link className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark" to="/admin/products">Cancel</Link></div>
        </form>}
      </div>
    </>
  )
}