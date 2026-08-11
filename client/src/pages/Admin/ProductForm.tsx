import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../services/api'
import { createAdminProduct, getAdminCategories, getAdminProduct, updateAdminProduct, type ProductFormInput } from '../../services/adminService'
import type { Category } from '../../types/category'

const initialForm: ProductFormInput = { name: '', categoryId: '', price: '', unit: '', description: '', stockQuantity: '0', isActive: true }
const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxImageSize = 5 * 1024 * 1024
type FormErrors = Partial<Record<'name' | 'categoryId' | 'price' | 'unit' | 'description' | 'stockQuantity' | 'image', string>>

export function ProductForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState<ProductFormInput>(initialForm)
  const [categories, setCategories] = useState<Category[]>([])
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(isEditing)
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'uploading' | 'saving'>('idle')

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
      setForm({ name: product.name, categoryId: product.categoryId ?? '', price: String(product.price), unit: product.unit, description: product.description, stockQuantity: String(product.stockQuantity ?? 0), isActive: product.isActive })
      setCurrentImage(product.image)
    }).catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Product could not be loaded.')).finally(() => setIsLoading(false))
    return () => { current = false }
  }, [id])

  const update = <Key extends keyof ProductFormInput>(field: Key, value: ProductFormInput[Key]) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setError(null)
  }

  const chooseImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!acceptedImageTypes.includes(file.type)) {
      setFieldErrors((current) => ({ ...current, image: 'Choose a JPG, PNG, or WEBP image.' }))
      return
    }
    if (file.size > maxImageSize) {
      setFieldErrors((current) => ({ ...current, image: 'Product images must be 5 MB or smaller.' }))
      return
    }
    setFieldErrors((current) => ({ ...current, image: undefined }))
    update('image', file)
    setImagePreview(URL.createObjectURL(file))
  }

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {}
    const name = form.name.trim()
    const unit = form.unit.trim()
    const description = form.description.trim()
    const price = form.price.trim()
    const stock = Number(form.stockQuantity)
    if (name.length < 2 || name.length > 180) nextErrors.name = 'Use 2 to 180 characters.'
    if (!form.categoryId) nextErrors.categoryId = 'Select an active category.'
    else if (categories.find((category) => category.id === form.categoryId)?.isActive !== true) nextErrors.categoryId = 'Select an active category.'
    if (!/^\d+(?:\.\d{1,2})?$/.test(price) || Number(price) <= 0) nextErrors.price = 'Enter a price greater than zero with up to 2 decimals.'
    if (!unit || unit.length > 80) nextErrors.unit = 'Enter a unit using up to 80 characters.'
    if (description.length < 10 || description.length > 4000) nextErrors.description = 'Use 10 to 4,000 characters.'
    if (!Number.isInteger(stock) || stock < 0) nextErrors.stockQuantity = 'Enter a non-negative whole number.'
    if (!isEditing && !form.image) nextErrors.image = 'Select a product image.'
    return nextErrors
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setError('Please correct the highlighted fields.')
      return
    }
    setIsSaving(true)
    setSaveStatus(form.image ? 'uploading' : 'saving')
    try {
      // The API performs the Cloudinary upload as part of this request.
      if (form.image) setSaveStatus('uploading')
      if (id) await updateAdminProduct(id, form)
      else await createAdminProduct(form)
      navigate('/admin/products', { replace: true, state: { message: `Product ${isEditing ? 'updated' : 'created'} successfully.` } })
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Product could not be saved.')
    } finally {
      setIsSaving(false)
      setSaveStatus('idle')
    }
  }

  const fieldProps = (field: keyof FormErrors) => ({
    'aria-invalid': Boolean(fieldErrors[field]),
    'aria-describedby': fieldErrors[field] ? `${field}-error` : undefined,
  })

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
            <label className="text-sm font-bold text-green-dark">Category<select className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 font-normal outline-none focus:border-green" {...fieldProps('categoryId')} value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)} disabled={isCategoriesLoading} required><option value="">{isCategoriesLoading ? 'Loading categories…' : 'Select category'}</option>{categories.filter((category) => category.isActive).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{fieldErrors.categoryId && <span className="mt-1 block text-xs font-normal text-orange" id="categoryId-error">{fieldErrors.categoryId}</span>}</label>
            <label className="text-sm font-bold text-green-dark">Price (NGN)<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" {...fieldProps('price')} type="text" inputMode="decimal" value={form.price} onChange={(event) => update('price', event.target.value)} placeholder="0.00" required />{fieldErrors.price && <span className="mt-1 block text-xs font-normal text-orange" id="price-error">{fieldErrors.price}</span>}</label>
            <label className="text-sm font-bold text-green-dark">Unit / quantity<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" {...fieldProps('unit')} value={form.unit} onChange={(event) => update('unit', event.target.value)} maxLength={80} placeholder="5 kg bag" required />{fieldErrors.unit && <span className="mt-1 block text-xs font-normal text-orange" id="unit-error">{fieldErrors.unit}</span>}</label>
            <label className="text-sm font-bold text-green-dark">Stock quantity<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" {...fieldProps('stockQuantity')} type="number" min="0" step="1" value={form.stockQuantity} onChange={(event) => update('stockQuantity', event.target.value)} required />{fieldErrors.stockQuantity && <span className="mt-1 block text-xs font-normal text-orange" id="stockQuantity-error">{fieldErrors.stockQuantity}</span>}</label>
          </div>
          <label className="block text-sm font-bold text-green-dark">Description<textarea className="mt-2 min-h-32 w-full resize-y rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" {...fieldProps('description')} value={form.description} onChange={(event) => update('description', event.target.value)} maxLength={4000} required />{fieldErrors.description && <span className="mt-1 block text-xs font-normal text-orange" id="description-error">{fieldErrors.description}</span>}<span className="mt-1 block text-xs font-normal text-muted">{form.description.length}/4,000 characters</span></label>
          <label className="block text-sm font-bold text-green-dark">Product image<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal file:mr-3 file:border-0 file:bg-sage file:px-3 file:py-1 file:font-bold" {...fieldProps('image')} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} required={!isEditing} /><span className="mt-1 block text-xs font-normal text-muted">JPG, PNG, or WEBP up to 5 MB. {isEditing && 'Leave empty to keep the current image.'}</span>{fieldErrors.image && <span className="mt-1 block text-xs font-normal text-orange" id="image-error">{fieldErrors.image}</span>}</label>
          {(imagePreview || currentImage) && <img className="size-28 rounded-2xl object-cover" src={imagePreview || currentImage || ''} alt="Product preview" />}
          <label className="flex items-center gap-3 text-sm font-bold text-green-dark"><input className="size-4 accent-green" type="checkbox" checked={form.isActive} onChange={(event) => update('isActive', event.target.checked)} />Available / active for sale</label>
          {error && <p className="text-sm font-medium text-orange" role="alert">{error}</p>}
          {isSaving && <p className="text-sm font-semibold text-muted" role="status">{saveStatus === 'uploading' ? 'Uploading image…' : 'Saving product…'}</p>}
          <div className="flex flex-wrap gap-3"><button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={isSaving || isCategoriesLoading}>{isSaving ? saveStatus === 'uploading' ? 'Uploading image…' : 'Saving product…' : isEditing ? 'Save changes' : 'Create product'}</button><Link className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark" to="/admin/products">Cancel</Link></div>
        </form>}
      </div>
    </>
  )
}