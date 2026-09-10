import { CloseIcon, FilterIcon } from '../../../assets/icons'

interface FilterSheetHeaderProps {
  onClose: () => void
}

export function FilterSheetHeader({ onClose }: FilterSheetHeaderProps) {
  return (
    <div className="filter-sheet-header">
      <h2 className="filter-sheet-title">
        <FilterIcon size={18} aria-hidden="true" />
        <span>Filters</span>
      </h2>
      <button className="filter-sheet-close" type="button" aria-label="Close filters" onClick={onClose}>
        <CloseIcon size={18} aria-hidden="true" />
      </button>
    </div>
  )
}