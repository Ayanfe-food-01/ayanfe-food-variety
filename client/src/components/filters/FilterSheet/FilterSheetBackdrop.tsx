interface FilterSheetBackdropProps {
  onClose: () => void
}

export function FilterSheetBackdrop({ onClose }: FilterSheetBackdropProps) {
  return <div className="filter-sheet-backdrop" onClick={onClose} aria-hidden="true" />
}