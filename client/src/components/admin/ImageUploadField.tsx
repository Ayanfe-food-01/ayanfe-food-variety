import type { ChangeEvent } from 'react'
import { CloseIcon } from '../../assets/icons'

const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const maxImageSize = 5 * 1024 * 1024

interface ImageUploadFieldProps {
  label: string
  helperText: string
  alt: string
  currentUrl?: string | null
  previewUrl?: string | null
  error?: string
  required?: boolean
  accept?: string
  previewClassName?: string
  validateFile?: (file: File) => string | null | Promise<string | null>
  onChange: (file: File | undefined, previewUrl: string | null, error: string | null) => void
  multiple?: boolean
  onMultipleChange?: (files: File[], previewUrls: string[], error: string | null) => void
  onRemove?: () => void
  isRemoving?: boolean
}

export function ImageUploadField({
  label,
  helperText,
  alt,
  currentUrl,
  previewUrl,
  error,
  required = false,
  accept = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif',
  previewClassName = 'h-40 w-full max-w-md rounded-2xl object-cover',
  validateFile,
  onChange,
  multiple = false,
  onMultipleChange,
  onRemove,
  isRemoving = false,
}: ImageUploadFieldProps) {
  const chooseImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      if (multiple && onMultipleChange) onMultipleChange([], [], null)
      onChange(undefined, null, null)
      return
    }

    for (const file of files) {
      const hasSupportedExtension = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
      if (!acceptedImageTypes.includes(file.type) && !hasSupportedExtension) {
        event.currentTarget.value = ''
        const message = 'Choose a JPG, PNG, WEBP, or iPhone HEIC/HEIF image.'
        if (multiple && onMultipleChange) onMultipleChange([], [], message)
        else onChange(undefined, null, message)
        return
      }
      if (file.size > maxImageSize) {
        event.currentTarget.value = ''
        const message = 'Images must be 5 MB or smaller.'
        if (multiple && onMultipleChange) onMultipleChange([], [], message)
        else onChange(undefined, null, message)
        return
      }
      const validationError = await validateFile?.(file)
      if (validationError) {
        event.currentTarget.value = ''
        if (multiple && onMultipleChange) onMultipleChange([], [], validationError)
        else onChange(undefined, null, validationError)
        return
      }
    }

    const previews = files.map((file) => URL.createObjectURL(file))
    if (multiple && onMultipleChange) onMultipleChange(files, previews, null)
    else onChange(files[0], previews[0], null)
  }

  const hasImage = Boolean(previewUrl || currentUrl)
  const showRemove = !multiple && hasImage && Boolean(previewUrl || onRemove)
  const removeImage = () => {
    if (previewUrl) {
      onChange(undefined, null, null)
      return
    }
    onRemove?.()
  }

  return (
    <div>
      <label className="block text-sm font-bold text-green-dark">
        {label}
        <input
          className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal file:mr-3 file:border-0 file:bg-sage file:px-3 file:py-1 file:font-bold"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={chooseImage}
          required={required}
        />
        <span className="mt-1 block text-xs font-normal text-muted">{helperText}</span>
      </label>
      {error && <p className="mt-1 text-xs font-normal text-orange" role="alert">{error}</p>}
      {hasImage && (
        <div className="relative mt-3">
          <img key={previewUrl || currentUrl} className={`${previewClassName} block`} src={previewUrl || currentUrl || ''} alt={alt} onError={(event) => {
            event.currentTarget.style.display = 'none'
          }} />
          {showRemove && (
            <button
              className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-full border border-white/40 bg-green-dark/75 text-white shadow-sm transition-colors hover:bg-orange disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              aria-label={`Remove ${alt}`}
              title={previewUrl ? 'Remove this new image' : 'Remove image'}
              onClick={removeImage}
              disabled={isRemoving}
            >
              <CloseIcon size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}