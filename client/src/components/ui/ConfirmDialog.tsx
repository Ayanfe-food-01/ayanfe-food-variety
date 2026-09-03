import { useEffect, useId } from 'react'
import { lockBodyScroll } from '../../utils/browserCompatibility'

interface ConfirmDialogProps {
  eyebrow?: string
  title: string
  description: string
  error?: string | null
  isBusy?: boolean
  confirmLabel?: string
  busyLabel?: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  eyebrow = 'Please confirm',
  title,
  description,
  error,
  isBusy = false,
  confirmLabel = 'Confirm',
  busyLabel = 'Working…',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const releaseBodyScroll = lockBodyScroll()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) onCancel()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => {
      releaseBodyScroll()
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isBusy, onCancel])

  return (
    <div className="safe-modal-backdrop fixed inset-0 z-50 grid place-items-center bg-green-dark/45" role="presentation">
      <div
        className="w-full max-w-md rounded-3xl border border-line bg-white p-7 shadow-2xl shadow-green-dark/20 sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">{eyebrow}</p>
        <h2 id={titleId} className="mt-2 text-2xl font-bold tracking-[-0.04em] text-green-dark">{title}</h2>
        <p id={descriptionId} className="mt-4 text-sm leading-6 text-muted">{description}</p>
        {error && <p className="mt-4 rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">{error}</p>}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={isBusy}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-orange px-5 py-3 text-sm font-bold text-white hover:bg-orange/90 disabled:cursor-wait disabled:opacity-50"
            type="button"
            disabled={isBusy}
            onClick={onConfirm}
          >
            {isBusy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}