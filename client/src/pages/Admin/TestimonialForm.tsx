import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../services/api'
import { ImageUploadField } from '../../components/admin/ImageUploadField'
import { SubmitButton } from '../../components/ui/SubmitButton'
import { getSaveProgressLabel } from '../../components/admin/saveProgress'
import {
  createAdminTestimonial,
  getAdminTestimonial,
  updateAdminTestimonial,
  type TestimonialInput,
} from '../../services/adminService'

const initialForm: TestimonialInput = {
  authorName: '',
  content: '',
  rating: '',
  displayOrder: 0,
  isActive: true,
  isFeatured: false,
}

export function TestimonialForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState<TestimonialInput>(initialForm)
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    getAdminTestimonial(id)
      .then((testimonial) => {
        setForm({
          authorName: testimonial.authorName,
          content: testimonial.content,
          rating: testimonial.rating === null ? '' : String(testimonial.rating),
          displayOrder: testimonial.displayOrder,
          isActive: testimonial.isActive,
          isFeatured: testimonial.isFeatured,
        })
        setCurrentAvatar(testimonial.avatarUrl)
      })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Testimonial could not be loaded.'))
      .finally(() => setIsLoading(false))
  }, [id])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const authorName = form.authorName.trim()
    const content = form.content.trim()
    setError(null)
    if (!authorName) {
      setFieldError('Author name is required.')
      return
    }
    if (!content) {
      setFieldError('Testimonial is required.')
      return
    }
    if (imageError) return
    setFieldError(null)
    setIsSaving(true)
    try {
      const input = { ...form, authorName, content }
      if (isEditing && id) await updateAdminTestimonial(id, input)
      else await createAdminTestimonial(input)
      navigate('/admin/testimonials', {
        replace: true,
        state: { toast: { message: `Testimonial ${isEditing ? 'updated' : 'created'} successfully.`, type: 'success' } },
      })
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : `Testimonial could not be ${isEditing ? 'updated' : 'created'}.`)
    } finally {
      setIsSaving(false)
    }
  }

  const progressLabel = getSaveProgressLabel(isEditing ? 'update' : 'create')

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Social proof</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">{isEditing ? 'Edit testimonial' : 'Add testimonial'}</h1><p className="mt-3 text-sm text-muted">{isEditing ? 'Update the quote, rating, or placement of this testimonial.' : 'Capture a customer quote to showcase on your storefront.'}</p></div>
        <Link className="text-sm font-bold text-green hover:text-orange" to="/admin/testimonials">Back to testimonials</Link>
      </div>
      <div className="mt-8 max-w-3xl rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
        {isLoading ? <p className="text-sm text-muted">Loading testimonial…</p> : <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-bold text-green-dark">Author name<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={form.authorName} onChange={(event) => { setForm({ ...form, authorName: event.target.value }); setFieldError(null) }} maxLength={180} required placeholder="Adaeze O." /></label>
            <label className="block text-sm font-bold text-green-dark">Rating <span className="font-normal text-muted">(optional)</span><input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" type="number" min="1" max="5" step="1" value={form.rating} onChange={(event) => setForm({ ...form, rating: event.target.value })} placeholder="5" /><span className="mt-1 block text-xs font-normal text-muted">A whole number between 1 and 5.</span></label>
          </div>
          <label className="block text-sm font-bold text-green-dark">Testimonial<textarea className="mt-2 min-h-32 w-full resize-y rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={form.content} onChange={(event) => { setForm({ ...form, content: event.target.value }); setFieldError(null) }} maxLength={2000} required placeholder="“Their jollof rice brought the taste of home back to my kitchen.”" /></label>
          <ImageUploadField label={`Profile image${isEditing ? ' (optional replacement)' : ''}`} helperText={`JPG, PNG, or WEBP up to ${isEditing ? '5 MB. Leave empty to keep the current image.' : '5 MB; optional.'}`} alt="Author avatar preview" currentUrl={currentAvatar} previewUrl={avatarPreview} error={imageError ?? undefined} required={false} previewClassName="size-28 rounded-full object-cover" onChange={(file, preview, uploadError) => { setForm((current) => ({ ...current, avatar: file })); setAvatarPreview(preview); setImageError(uploadError) }} />
          <label className="block text-sm font-bold text-green-dark">Display order<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" type="number" min="0" max="999999" step="1" value={form.displayOrder} onChange={(event) => setForm({ ...form, displayOrder: Math.max(0, Number(event.target.value) || 0) })} /><span className="mt-1 block text-xs font-normal text-muted">Lower numbers appear first when labels are shown.</span></label>
          <label className="flex items-start gap-3 rounded-xl border border-line bg-cream/50 p-4 text-sm text-green-dark"><input className="mt-0.5 size-4 accent-green" type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /><span><span className="block font-bold">Active</span><span className="mt-1 block text-xs font-normal leading-5 text-muted">Inactive testimonials remain saved in the admin portal but are hidden from customers.</span></span></label>
          <label className="flex items-start gap-3 rounded-xl border border-line bg-cream/50 p-4 text-sm text-green-dark"><input className="mt-0.5 size-4 accent-green" type="checkbox" checked={form.isFeatured} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} /><span><span className="block font-bold">Mark as featured</span><span className="mt-1 block text-xs font-normal leading-5 text-muted">Featured testimonials can be highlighted in your storefront testimonial section.</span></span></label>
          {fieldError && <p className="text-sm font-medium text-orange" role="alert">{fieldError}</p>}
          {error && <p className="text-sm font-medium text-orange" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-3"><SubmitButton busy={isSaving} busyLabel={progressLabel}>{isEditing ? 'Save changes' : 'Create testimonial'}</SubmitButton><Link className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark" to="/admin/testimonials">Cancel</Link></div>
        </form>}
      </div>
    </>
  )
}