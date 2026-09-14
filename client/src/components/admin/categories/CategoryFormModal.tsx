import { useState, type FormEvent } from 'react'
import { ApiError } from '../../../services/api'
import { ImageUploadField } from '../ImageUploadField'
import { Modal } from '../../ui/Modal'
import { SubmitButton } from '../../ui/SubmitButton'
import { getSaveProgressLabel } from '../saveProgress'
import { createAdminCategory, updateAdminCategory, type CategoryInput } from '../../../services/adminService'
import type { Category } from '../../../types/category'

interface CategoryFormModalProps {
  category: Category | null
  onClose: () => void
  onSaved: (category: Category) => void
}

interface CategoryFieldErrors {
  name?: string
  description?: string
}

const fieldControlClass = 'mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10'

export function CategoryFormModal({ category, onClose, onSaved }: CategoryFormModalProps) {
  const isEditing = Boolean(category)
  const [form, setForm] = useState<CategoryInput>(() => ({
    name: category?.name ?? '',
    description: category?.description ?? '',
    isActive: category?.isActive ?? true,
  }))
  const [currentImage] = useState<string | null>(category?.imageUrl || null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<CategoryFieldErrors>({})

  const chooseImage = (file: File | undefined, preview: string | null, errorMessage: string | null) => {
    setImageError(errorMessage)
    setForm((current: CategoryInput) => ({ ...current, image: file }))
    setImagePreview(preview)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const name = form.name.trim()
    const description = form.description.trim()
    const nextErrors: CategoryFieldErrors = {}
    if (!name) nextErrors.name = 'Category name is required.'
    else if (name.length > 120) nextErrors.name = 'Category name must be 120 characters or fewer.'
    if (!description) nextErrors.description = 'Description is required.'
    else if (description.length > 500) nextErrors.description = 'Description must be 500 characters or fewer.'
    setFieldErrors(nextErrors)

    if (imageError) return
    const hasImage = isEditing ? Boolean(currentImage || form.image) : Boolean(form.image)
    if (!hasImage) {
      setImageError('Category image is required.')
      return
    }
    if (nextErrors.name || nextErrors.description) return

    setIsSaving(true)
    try {
      const input: CategoryInput = { ...form, name, description }
      const saved = isEditing
        ? await updateAdminCategory(category!.id, input)
        : await createAdminCategory(input)
      onSaved(saved)
    } catch (caught: unknown) {
      const message = caught instanceof ApiError
        ? caught.message
        : `Category could not be ${isEditing ? 'updated' : 'created'}.`
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const progressLabel = getSaveProgressLabel(isEditing ? 'update' : 'create')

  return (
    <Modal
      eyebrow="Catalog"
      title={isEditing ? 'Edit category' : 'Add category'}
      maxWidth="max-w-lg"
      blocking={isSaving}
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark transition-colors hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={isSaving}
            onClick={onClose}
          >
            Cancel
          </button>
          <SubmitButton form="category-modal-form" className="px-6! py-3! text-sm!" busy={isSaving} busyLabel={progressLabel} disabled={isSaving}>
            {isEditing ? 'Save changes' : 'Create category'}
          </SubmitButton>
        </div>
      }
    >
      <form id="category-modal-form" className="space-y-5" onSubmit={(event) => void submit(event)}>
        <label className="block text-sm font-bold text-green-dark">
          Category name
          <input
            className={fieldControlClass}
            aria-invalid={Boolean(fieldErrors.name)}
            value={form.name}
            onChange={(event) => {
              setForm((current: CategoryInput) => ({ ...current, name: event.target.value }))
              setFieldErrors((current: CategoryFieldErrors) => ({ ...current, name: undefined }))
              setError(null)
            }}
            maxLength={120}
            required
          />
          {fieldErrors.name && <span className="mt-1 block text-xs font-normal text-orange" role="alert">{fieldErrors.name}</span>}
        </label>
        <label className="block text-sm font-bold text-green-dark">
          Description
          <textarea
            className={`${fieldControlClass} min-h-28 resize-y`}
            aria-invalid={Boolean(fieldErrors.description)}
            value={form.description}
            onChange={(event) => {
              setForm((current: CategoryInput) => ({ ...current, description: event.target.value }))
              setFieldErrors((current: CategoryFieldErrors) => ({ ...current, description: undefined }))
              setError(null)
            }}
            maxLength={500}
            required
          />
          {fieldErrors.description && <span className="mt-1 block text-xs font-normal text-orange" role="alert">{fieldErrors.description}</span>}
          <span className="mt-1 block text-xs font-normal text-muted">{form.description.length}/500 characters</span>
        </label>
        <div>
          <ImageUploadField
            label="Category image"
            helperText="JPG, PNG, or WEBP up to 5 MB."
            alt="Category preview"
            currentUrl={currentImage}
            previewUrl={imagePreview}
            error={imageError ?? undefined}
            required
            onChange={chooseImage}
          />
        </div>
        <label className="flex items-center gap-3 text-sm font-bold text-green-dark">
          <input className="size-4 accent-green" type="checkbox" checked={form.isActive} onChange={(event) => setForm((current: CategoryInput) => ({ ...current, isActive: event.target.checked }))} />
          Active and available for products
        </label>
        {error && <p className="text-sm font-medium text-orange" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}