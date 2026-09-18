import type { FilterField, FilterValues } from '../filterTypes'
import { FilterSheetHeader } from './FilterSheetHeader'
import { FilterSheetBody } from './FilterSheetBody'
import { FilterSheetFooter } from './FilterSheetFooter'

export interface FilterSheetPanelProps {
  fields: FilterField[]
  draft: FilterValues
  onDraftChange: (draft: FilterValues) => void
  onApply: (next: FilterValues) => void
  onClose: () => void
  isPopover?: boolean
}

function setFieldValue(draft: FilterValues, key: string, value: string): FilterValues {
  return { ...draft, [key]: value || '' }
}

export function FilterSheetPanel({ fields, draft, onDraftChange, onApply, onClose, isPopover = false }: FilterSheetPanelProps) {
  const handleFieldChange = (key: string, value: string) => {
    onDraftChange(setFieldValue(draft, key, value))
  }

  const handleClear = () => onDraftChange({})

  const handleApply = () => {
    onApply(draft)
    onClose()
  }

  return (
    <div
      className={`flex flex-col overflow-hidden bg-cream ${
        isPopover
          ? 'fixed inset-auto left-[var(--filter-sheet-left)] top-[var(--filter-sheet-top)] w-[var(--filter-sheet-width)] max-h-[calc(100dvh-var(--filter-sheet-top)-16px)] rounded-[16px] shadow-[0_18px_48px_rgb(20_33_22/0.22)] animate-sheet-popover motion-reduce:animate-none'
          : 'absolute inset-x-0 bottom-0 max-h-[92svh] rounded-t-[22px] shadow-[0_-18px_50px_rgb(20_33_22/0.25)] animate-sheet-up motion-reduce:animate-none'
      }`}
    >
      <FilterSheetHeader onClose={onClose} isPopover={isPopover} />
      <FilterSheetBody fields={fields} draft={draft} onFieldChange={handleFieldChange} isPopover={isPopover} />
      <FilterSheetFooter onClear={handleClear} onApply={handleApply} isPopover={isPopover} />
    </div>
  )
}