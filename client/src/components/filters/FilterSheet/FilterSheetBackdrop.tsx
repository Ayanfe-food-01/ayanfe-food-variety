interface FilterSheetBackdropProps {
  onClose: () => void
  isPopover?: boolean
}

export function FilterSheetBackdrop({ onClose, isPopover = false }: FilterSheetBackdropProps) {
  return (
    <div
      className={`absolute inset-0 animate-sheet-fade motion-reduce:animate-none ${isPopover ? 'bg-transparent pointer-events-auto' : 'bg-[#10160f]/48'}`}
      onClick={onClose}
      aria-hidden="true"
    />
  )
}