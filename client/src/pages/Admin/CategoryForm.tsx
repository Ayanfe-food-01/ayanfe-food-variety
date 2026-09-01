import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../services/api'
import { ImageUploadField } from '../../components/admin/ImageUploadField'
import { SubmitButton } from '../../components/ui/SubmitButton'
import { getSaveProgressLabel } from '../../components/admin/saveProgress'
import { createAdminCategory, getAdminCategory, updateAdminCategory, type CategoryInput } from '../../services/adminService'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'

const initialForm: CategoryInput = { name: '', description: '', isActive: true }

export function CategoryForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState<CategoryInput>(initialForm)
  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  useInitialRouteLoad(!isLoading)
  const [imageError, setImageError] = useState<string | null>(null)
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getAdminCategory(id)
      .then((category) => {
        setForm({ name: category.name, description: category.description, isActive: category.isActive })
        setCurrentImage(category.imageUrl || null)
      })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Category could not be loaded.'))
      .finally(() => setIsLoading(false))
  }, [id])

  const chooseImage = (file: File | undefined, preview: string | null, errorMessage: string | null) => {
    setImageError(errorMessage)
    setForm((current) => ({ ...current, image: file }))
    setImagePreview(preview)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const name = form.name.trim()
    const description = form.description.trim()
    if (!name) {
      setFieldError('Category name is required.')
      return
    }
    if (imageError) return
    if (name.length > 120) {
      setFieldError('Category name must be 120 characters or fewer.')
      return
    }
    setFieldError(null)
    setIsSaving(true)
    try {
      const input = { ...form, name, description }
      if (id) await updateAdminCategory(id, input)
      else await createAdminCategory(input)
      navigate('/admin/categories', {
        replace: true,
        state: { toast: { message: `Category ${isEditing ? 'updated' : 'created'} successfully.`, type: 'success' } },
      })
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : `Category could not be ${isEditing ? 'updated' : 'created'}.`)
    } finally {
      setIsSaving(false)
    }
  }

  const progressLabel = getSaveProgressLabel(isEditing ? 'update' : 'create')

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Catalog</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">{isEditing ? 'Edit category' : 'Add category'}</h1><p className="mt-3 text-sm text-muted">{isEditing ? 'Update category details without changing its product relationships.' : 'Create a category that can be assigned to new products.'}</p></div>
        <Link className="text-sm font-bold text-green hover:text-orange" to="/admin/categories">Back to categories</Link>
      </div>
      <div className="mt-8 max-w-3xl rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
        {isLoading ? <p className="text-sm text-muted">Loading category…</p> : <form className="space-y-5" onSubmit={submit}>
          <label className="block text-sm font-bold text-green-dark">Category name<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" aria-invalid={Boolean(fieldError)} value={form.name} onChange={(event) => { setForm({ ...form, name: event.target.value }); setFieldError(null); setError(null) }} maxLength={120} required />{fieldError && <span className="mt-1 block text-xs font-normal text-orange" role="alert">{fieldError}</span>}</label>
           <label className="block text-sm font-bold text-green-dark">Description <span className="font-normal text-muted">(optional)</span><textarea className="mt-2 min-h-28 w-full resize-y rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={form.description} onChange={(event) => { setForm({ ...form, description: event.target.value }); setError(null) }} maxLength={500} /><span className="mt-1 block text-xs font-normal text-muted">{form.description.length}/500 characters</span></label>
           <div>
              <ImageUploadField
                label="Category image (optional)"
                helperText={`JPG, PNG, or WEBP up to 5 MB. ${isEditing ? 'Leave empty to keep the current image.' : ''}`}
                alt="Category preview"
                currentUrl={currentImage}
                previewUrl={imagePreview}
                error={imageError ?? undefined}
                onChange={chooseImage}
              />
           </div>
          <label className="flex items-center gap-3 text-sm font-bold text-green-dark"><input className="size-4 accent-green" type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />Active and available for products</label>
           {error && <p className="text-sm font-medium text-orange" role="alert">{error}</p>}
            <div className="flex flex-wrap gap-3"><SubmitButton busy={isSaving} busyLabel={progressLabel}>{isEditing ? 'Save changes' : 'Create category'}</SubmitButton><Link className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark" to="/admin/categories">Cancel</Link></div>
        </form>}
      </div>
    </>
  )
}