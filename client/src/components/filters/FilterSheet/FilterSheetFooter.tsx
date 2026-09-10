interface FilterSheetFooterProps {
  onClear: () => void
  onApply: () => void
}

export function FilterSheetFooter({ onClear, onApply }: FilterSheetFooterProps) {
  return (
    <div className="filter-sheet-footer">
      <button className="filter-sheet-clear" type="button" onClick={onClear}>
        Clear
      </button>
      <button className="filter-sheet-apply" type="button" onClick={onApply}>
        Apply
      </button>
    </div>
  )
}