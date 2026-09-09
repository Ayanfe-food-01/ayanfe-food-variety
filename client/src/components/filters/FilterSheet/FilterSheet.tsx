import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'
import { lockBodyScroll } from '../../../utils/browserCompatibility'
import { resolveVisibleAnchor, getFilterSheetMode, computePopoverPosition } from './filterSheetMode'
import type { FilterSheetMode, PopoverPosition } from './filterSheetMode'
import { FilterSheetPortal } from './FilterSheetPortal'
import { FilterSheetBackdrop } from './FilterSheetBackdrop'
import { FilterSheetPanel } from './FilterSheetPanel'
import type { FilterField, FilterValues } from '../filterTypes'

export interface FilterSheetProps {
  onClose: () => void
  fields: FilterField[]
  committed: FilterValues
  onApply: (next: FilterValues) => void
  anchorRefs?: ReadonlyArray<RefObject<HTMLElement | null> | undefined>
}

interface SheetGeometry {
  filterMode: FilterSheetMode
  popoverPosition: PopoverPosition | null
}

function measureGeometry(anchorRefs: FilterSheetProps['anchorRefs']): SheetGeometry {
  const anchor = resolveVisibleAnchor(anchorRefs)
  const filterMode = getFilterSheetMode(anchor)
  return { filterMode, popoverPosition: anchor ? computePopoverPosition(anchor) : null }
}

export function FilterSheet({ onClose, fields, committed, onApply, anchorRefs }: FilterSheetProps) {
  const [{ filterMode, popoverPosition }, setGeometry] = useState<SheetGeometry>(() =>
    measureGeometry(anchorRefs),
  )
  const [draft, setDraft] = useState<FilterValues>(committed)

  const updateGeometry = useCallback(() => {
    setGeometry(measureGeometry(anchorRefs))
  }, [anchorRefs])

  useLayoutEffect(() => {
    window.addEventListener('resize', updateGeometry)
    window.addEventListener('scroll', updateGeometry, true)
    return () => {
      window.removeEventListener('resize', updateGeometry)
      window.removeEventListener('scroll', updateGeometry, true)
    }
  }, [updateGeometry])

  useEffect(() => {
    if (filterMode !== 'popover') {
      const release = lockBodyScroll()
      return () => release()
    }
    return undefined
  }, [filterMode])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const isPopover = filterMode === 'popover' && popoverPosition !== null

  return (
    <FilterSheetPortal>
      <div
        id="filter-sheet"
        className={`filter-sheet ${isPopover ? 'is-popover' : ''}`.trim()}
        role="dialog"
        aria-modal={isPopover ? undefined : true}
        aria-label="Filters"
        style={isPopover && popoverPosition ? {
          '--filter-sheet-top': `${popoverPosition.top}px`,
          '--filter-sheet-left': `${popoverPosition.left}px`,
          '--filter-sheet-width': `${popoverPosition.width}px`,
        } as React.CSSProperties : undefined}
      >
        <FilterSheetBackdrop onClose={onClose} />
        <FilterSheetPanel
          fields={fields}
          draft={draft}
          onDraftChange={setDraft}
          onApply={onApply}
          onClose={onClose}
        />
      </div>
    </FilterSheetPortal>
  )
}