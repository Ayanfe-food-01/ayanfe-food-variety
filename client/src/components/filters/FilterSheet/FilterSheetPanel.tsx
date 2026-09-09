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
}

function setFieldValue(draft: FilterValues, key: string, value: string): FilterValues {
  return { ...draft, [key]: value || '' }
}

export function FilterSheetPanel({ fields, draft, onDraftChange, onApply, onClose }: FilterSheetPanelProps) {
  const handleFieldChange = (key: string, value: string) => {
    onDraftChange(setFieldValue(draft, key, value))
  }

  const handleClear = () => onDraftChange({})

  const handleApply = () => {
    onApply(draft)
    onClose()
  }

  return (
    <div className="filter-sheet-panel">
      <FilterSheetHeader onClose={onClose} />
      <FilterSheetBody fields={fields} draft={draft} onFieldChange={handleFieldChange} />
      <FilterSheetFooter onClear={handleClear} onApply={handleApply} />
    </div>
  )
}