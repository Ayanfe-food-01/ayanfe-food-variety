import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../services/api'
import { ImageUploadField } from '../../components/admin/ImageUploadField'
import { SubmitButton } from '../../components/ui/SubmitButton'
import { getSaveProgressLabel } from '../../components/admin/saveProgress'
import {
  createAdminBanner,
  getAdminBanner,
  updateAdminBanner,
  type BannerInput,
} from '../../services/adminService'

const initialForm: BannerInput = {
  title: '',
  promotionalText: '',
  buttonText: '',
  destination: '',
  displayOrder: 0,
  isActive: true,
}

export function BannerForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState<BannerInput>(initialForm)
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    getAdminBanner(id)
      .then((banner) => {
        setForm({
          title: banner.title,
          promotionalText: banner.promotionalText ?? '',
          buttonText: banner.buttonText ?? '',
          destination: banner.destination ?? '',
          displayOrder: banner.displayOrder,
          isActive: banner.isActive,
        })
        setCurrentImage(banner.imageUrl)
      })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Banner could not be loaded.'))
      .finally(() => setIsLoading(false))
  }, [id])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = form.title.trim()
    const destination = form.destination.trim()
    setError(null)
    if (!title) {
      setFieldError('Banner name is required.')
      return
    }
    if (destination && (!destination.startsWith('/') || destination.startsWith('//'))) {
      setFieldError('Destination must be an internal storefront path beginning with /.')
      return
    }
    if (!isEditing && !form.image) {
      setFieldError('Choose a banner image before saving.')
      return
    }
    if (imageError) return
    setFieldError(null)
    setIsSaving(true)
    try {
      const input = { ...form, title, destination }
      if (isEditing && id) await updateAdminBanner(id, input)
      else await createAdminBanner(input)
      navigate('/admin/banners', {
        replace: true,
        state: { toast: { message: `Banner ${isEditing ? 'updated' : 'created'} successfully.`, type: 'success' } },
      })
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : `Banner could not be ${isEditing ? 'updated' : 'created'}.`)
    } finally {
      setIsSaving(false)
    }
  }

  const progressLabel = getSaveProgressLabel(isEditing ? 'update' : 'create')

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Merchandising</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">{isEditing ? 'Edit banner' : 'Add banner'}</h1><p className="mt-3 text-sm text-muted">{isEditing ? 'Update the artwork or message without changing the banner position.' : 'Create a homepage promotion with artwork, messaging, and an optional internal destination.'}</p></div>
        <Link className="text-sm font-bold text-green hover:text-orange" to="/admin/banners">Back to banners</Link>
      </div>
      <div className="mt-8 max-w-3xl rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
        {isLoading ? <p className="text-sm text-muted">Loading banner…</p> : <form className="space-y-5" onSubmit={submit}>
          <label className="block text-sm font-bold text-green-dark">Internal banner name<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={form.title} onChange={(event) => { setForm({ ...form, title: event.target.value }); setFieldError(null) }} maxLength={180} required /><span className="mt-1 block text-xs font-normal text-muted">Used only to identify this promotion in the admin portal.</span></label>
          <ImageUploadField label={`Banner artwork${isEditing ? ' (optional replacement)' : ''}`} helperText={`JPG, PNG, or WEBP up to 5 MB. ${isEditing ? 'Leave empty to keep the current image.' : 'A wide landscape image works best.'}`} alt="Banner preview" currentUrl={currentImage} previewUrl={imagePreview} error={imageError ?? undefined} required={!isEditing} onChange={(file, preview, uploadError) => { setForm((current) => ({ ...current, image: file })); setImagePreview(preview); setImageError(uploadError) }} />
          <label className="block text-sm font-bold text-green-dark">Promotional text <span className="font-normal text-muted">(optional)</span><textarea className="mt-2 min-h-24 w-full resize-y rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={form.promotionalText} onChange={(event) => setForm({ ...form, promotionalText: event.target.value })} maxLength={500} placeholder="Fresh picks for your pantry, delivered with care." /></label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-bold text-green-dark">Button text <span className="font-normal text-muted">(optional)</span><input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={form.buttonText} onChange={(event) => setForm({ ...form, buttonText: event.target.value })} maxLength={120} placeholder="Shop now" /></label>
            <label className="block text-sm font-bold text-green-dark">Display order<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" type="number" min="0" max="999999" step="1" value={form.displayOrder} onChange={(event) => setForm({ ...form, displayOrder: Math.max(0, Number(event.target.value) || 0) })} /><span className="mt-1 block text-xs font-normal text-muted">Lower numbers appear first.</span></label>
          </div>
          <label className="block text-sm font-bold text-green-dark">Destination path <span className="font-normal text-muted">(optional)</span><input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} maxLength={500} placeholder="/shop or /new-arrivals" /><span className="mt-1 block text-xs font-normal text-muted">Only internal storefront paths are allowed; leave blank for an informational banner.</span></label>
          <label className="flex items-start gap-3 rounded-xl border border-line bg-cream/50 p-4 text-sm text-green-dark"><input className="mt-0.5 size-4 accent-green" type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /><span><span className="block font-bold">Active on homepage</span><span className="mt-1 block text-xs font-normal leading-5 text-muted">Inactive banners remain saved in the admin portal but are hidden from customers.</span></span></label>
          {fieldError && <p className="text-sm font-medium text-orange" role="alert">{fieldError}</p>}
          {error && <p className="text-sm font-medium text-orange" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-3"><SubmitButton busy={isSaving} busyLabel={progressLabel}>{isEditing ? 'Save changes' : 'Create banner'}</SubmitButton><Link className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark" to="/admin/banners">Cancel</Link></div>
        </form>}
      </div>
    </>
  )
}