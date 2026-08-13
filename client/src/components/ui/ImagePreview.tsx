import { useEffect, useState, type ReactNode } from 'react'
import { CloseIcon } from '../../assets/icons'

interface ImagePreviewProps {
  src: string
  alt: string
  label?: string
  children?: ReactNode
  className?: string
}

export function ImagePreview({ src, alt, label = 'View image', children, className = '' }: ImagePreviewProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasImageError, setHasImageError] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  return (
    <>
      <button
        className={className}
        type="button"
        aria-label={label}
        onClick={() => {
          setHasImageError(false)
          setIsOpen(true)
        }}
      >
        {children ?? label}
      </button>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-green-dark/80 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} preview`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false)
          }}
        >
          <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col items-center rounded-2xl bg-cream p-3 shadow-2xl sm:p-5">
            <div className="flex w-full items-center justify-between gap-4 pb-3">
              <p className="truncate text-sm font-bold text-green-dark">{alt}</p>
              <button
                className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white text-muted transition-colors hover:text-green-dark"
                type="button"
                aria-label="Close image preview"
                onClick={() => setIsOpen(false)}
              >
                <CloseIcon size={18} />
              </button>
            </div>
            <div className="flex min-h-48 w-full items-center justify-center overflow-hidden rounded-xl bg-green-dark/5">
              {hasImageError ? (
                <p className="px-6 py-12 text-center text-sm text-muted">This image could not be previewed.</p>
              ) : (
                <img
                  className="max-h-[calc(92vh-100px)] w-auto max-w-full object-contain"
                  src={src}
                  alt={alt}
                  onError={() => setHasImageError(true)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}