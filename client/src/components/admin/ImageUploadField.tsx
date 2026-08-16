import type { ChangeEvent } from 'react'

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
}: ImageUploadFieldProps) {
  const chooseImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      onChange(undefined, null, null)
      return
    }

    const hasSupportedExtension = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
    if (!acceptedImageTypes.includes(file.type) && !hasSupportedExtension) {
      event.currentTarget.value = ''
      onChange(undefined, null, 'Choose a JPG, PNG, WEBP, or iPhone HEIC/HEIF image.')
      return
    }
    if (file.size > maxImageSize) {
      event.currentTarget.value = ''
      onChange(undefined, null, 'Images must be 5 MB or smaller.')
      return
    }

    const validationError = await validateFile?.(file)
    if (validationError) {
      event.currentTarget.value = ''
      onChange(undefined, null, validationError)
      return
    }

    onChange(file, URL.createObjectURL(file), null)
  }

  return (
    <div>
      <label className="block text-sm font-bold text-green-dark">
        {label}
        <input
          className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal file:mr-3 file:border-0 file:bg-sage file:px-3 file:py-1 file:font-bold"
          type="file"
            accept={accept}
          onChange={chooseImage}
          required={required}
        />
        <span className="mt-1 block text-xs font-normal text-muted">{helperText}</span>
      </label>
      {error && <p className="mt-1 text-xs font-normal text-orange" role="alert">{error}</p>}
      {(previewUrl || currentUrl) && (
        <img className={`mt-3 ${previewClassName}`} src={previewUrl || currentUrl || ''} alt={alt} />
      )}
    </div>
  )
}