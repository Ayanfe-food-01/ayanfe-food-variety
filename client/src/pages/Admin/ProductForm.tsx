import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { ApiError } from '../../services/api'
import { createAdminProduct, getAdminCategories, getAdminProduct, updateAdminProduct, type ProductFormInput } from '../../services/adminService'
import type { Category } from '../../types/category'

const initialForm: ProductFormInput = { name: '', categoryId: '', price: '', unit: '', description: '', stockQuantity: '0', isActive: true }

export function ProductForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState<ProductFormInput>(initialForm)
  const [categories, setCategories] = useState<Category[]>([])
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAdminCategories().then(setCategories).catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Categories could not be loaded.'))
    if (!id) return
    getAdminProduct(id).then((product) => {
      setForm({ name: product.name, categoryId: product.categoryId ?? '', price: String(product.price), unit: product.unit, description: product.description, stockQuantity: String(product.stockQuantity ?? 0), isActive: product.isActive })
      setCurrentImage(product.image)
    }).catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Product could not be loaded.')).finally(() => setIsLoading(false))
  }, [id])

  const update = <Key extends keyof ProductFormInput>(field: Key, value: ProductFormInput[Key]) => setForm((current) => ({ ...current, [field]: value }))

  const chooseImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Product image must be a JPG, PNG, or WEBP image.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Product images must be 5 MB or smaller.'); return }
    setError(null)
    update('image', file)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!form.name.trim() || !form.categoryId || !form.price || !form.unit.trim() || !form.description.trim()) {
      setError('Complete all required product fields.')
      return
    }
    const stock = Number(form.stockQuantity)
    if (!Number.isInteger(stock) || stock < 0) { setError('Stock quantity must be a non-negative whole number.'); return }
    if (!isEditing && !form.image) { setError('Please select a product image.'); return }
    setIsSaving(true)
    try {
      if (id) await updateAdminProduct(id, form)
      else await createAdminProduct(form)
      navigate('/admin/products', { replace: true, state: { message: `Product ${isEditing ? 'updated' : 'created'} successfully.` } })
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Product could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Catalog</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">{isEditing ? 'Edit product' : 'Add product'}</h1><p className="mt-3 text-sm text-muted">{isEditing ? 'Update the product details and inventory level.' : 'Add a product customers can discover and purchase.'}</p></div>
        <Link className="text-sm font-bold text-green hover:text-orange" to="/admin/products">Back to products</Link>
      </div>
      <div className="mt-8 max-w-3xl rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
        {isLoading ? <p className="text-sm text-muted">Loading product…</p> : <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-bold text-green-dark sm:col-span-2">Product name<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" value={form.name} onChange={(event) => update('name', event.target.value)} maxLength={180} required /></label>
            <label className="text-sm font-bold text-green-dark">Category<select className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 font-normal outline-none focus:border-green" value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)} required><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="text-sm font-bold text-green-dark">Price (NGN)<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" type="number" min="0" step="0.01" value={form.price} onChange={(event) => update('price', event.target.value)} required /></label>
            <label className="text-sm font-bold text-green-dark">Unit / quantity<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" value={form.unit} onChange={(event) => update('unit', event.target.value)} maxLength={80} placeholder="5 kg bag" required /></label>
            <label className="text-sm font-bold text-green-dark">Stock quantity<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" type="number" min="0" step="1" value={form.stockQuantity} onChange={(event) => update('stockQuantity', event.target.value)} required /></label>
          </div>
          <label className="block text-sm font-bold text-green-dark">Description<textarea className="mt-2 min-h-32 w-full resize-y rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green" value={form.description} onChange={(event) => update('description', event.target.value)} maxLength={4000} required /></label>
          <label className="block text-sm font-bold text-green-dark">Product image<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal file:mr-3 file:border-0 file:bg-sage file:px-3 file:py-1 file:font-bold" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} required={!isEditing} /><span className="mt-1 block text-xs font-normal text-muted">JPG, PNG, or WEBP up to 5 MB. {isEditing && 'Leave empty to keep the current image.'}</span></label>
          {currentImage && <img className="size-28 rounded-2xl object-cover" src={currentImage} alt="Current product" />}
          <label className="flex items-center gap-3 text-sm font-bold text-green-dark"><input className="size-4 accent-green" type="checkbox" checked={form.isActive} onChange={(event) => update('isActive', event.target.checked)} />Available / active for sale</label>
          {error && <p className="text-sm font-medium text-orange" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-3"><button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:opacity-50" type="submit" disabled={isSaving}>{isSaving ? 'Saving product…' : isEditing ? 'Save changes' : 'Create product'}</button><Link className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark" to="/admin/products">Cancel</Link></div>
        </form>}
      </div>
    </AdminLayout>
  )
}