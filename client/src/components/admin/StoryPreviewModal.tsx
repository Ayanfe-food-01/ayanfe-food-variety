import { useEffect, useId, type ReactNode } from 'react'
import { CloseIcon } from '../../assets/icons'
import { CustomerStoryCard } from '../home/CustomerStoryCard'
import { ContentTypeBadge } from './ContentTypeBadge'
import { lockBodyScroll } from '../../utils/browserCompatibility'
import type { CustomerStory } from '../../services/storeSettingsService'

interface StoryPreviewModalProps {
  story: CustomerStory
  onClose: () => void
  details?: ReactNode
}

export function StoryPreviewModal({ story, onClose, details }: StoryPreviewModalProps) {
  const titleId = useId()

  useEffect(() => {
    const releaseBodyScroll = lockBodyScroll()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      releaseBodyScroll()
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return (
    <div className="safe-modal-backdrop y-scrollbar fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-green-dark/45 px-4 py-8" role="presentation" onClick={onClose}>
      <div className="w-full max-w-md" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <p id={titleId} className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Homepage preview</p>
            <ContentTypeBadge type={story.type} />
          </div>
          <button
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white text-muted transition-colors hover:bg-sage/40 hover:text-green-dark"
            type="button"
            aria-label="Close preview"
            onClick={onClose}
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted">How this story appears in the &quot;What Our Customers Say&quot; section.</p>
        {details && <div className="mt-3">{details}</div>}
        <div className="mt-4">
          <CustomerStoryCard story={story} />
        </div>
      </div>
    </div>
  )
}