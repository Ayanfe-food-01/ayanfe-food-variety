import { useEffect, useId, type ReactNode } from 'react'
import { CloseIcon } from '../../assets/icons'
import { lockBodyScroll } from '../../utils/browserCompatibility'

interface ModalProps {
  eyebrow?: string
  title: string
  blocking?: boolean
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
  maxWidth?: string
}

export function Modal({
  eyebrow,
  title,
  blocking = false,
  onClose,
  footer,
  children,
  maxWidth = 'max-w-xl',
}: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    const releaseBodyScroll = lockBodyScroll()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !blocking) onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => {
      releaseBodyScroll()
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [blocking, onClose])

  return (
    <div
      className="safe-modal-backdrop fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-green-dark/45 p-4"
      role="presentation"
      onClick={() => {
        if (!blocking) onClose()
      }}
    >
      <div
        className={`w-full ${maxWidth} my-8 rounded-3xl border border-line bg-white p-6 shadow-2xl shadow-green-dark/20 sm:p-8`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">{eyebrow}</p>}
            <h2 id={titleId} className={`font-bold tracking-[-0.04em] text-green-dark ${eyebrow ? 'mt-2' : ''}`}>
              {title}
            </h2>
          </div>
          <button
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-sage/40 hover:text-green-dark focus:outline-none focus:ring-2 focus:ring-green/20"
            type="button"
            aria-label="Close dialog"
            disabled={blocking}
            onClick={onClose}
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  )
}