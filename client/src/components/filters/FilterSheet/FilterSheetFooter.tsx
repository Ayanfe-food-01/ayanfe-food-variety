interface FilterSheetFooterProps {
  onClear: () => void
  onApply: () => void
  isPopover?: boolean
}

const FOOTER_BUTTON =
  'min-h-[46px] rounded-xl text-sm font-extrabold px-[18px] cursor-pointer transition-colors'

export function FilterSheetFooter({ onClear, onApply, isPopover = false }: FilterSheetFooterProps) {
  return (
    <div
      className={`flex gap-2.5 border-t border-line bg-cream pt-[14px] pb-[calc(14px+env(safe-area-inset-bottom))] px-[18px] ${
        isPopover ? 'pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] px-4' : ''
      }`}
    >
      <button
        className={`${FOOTER_BUTTON} flex-1 border border-line bg-transparent text-ink hover:border-orange hover:text-orange`}
        type="button"
        onClick={onClear}
      >
        Clear
      </button>
      <button
        className={`${FOOTER_BUTTON} flex-1 border border-green bg-green text-cream hover:border-green-dark hover:bg-green-dark`}
        type="button"
        onClick={onApply}
      >
        Apply
      </button>
    </div>
  )
}