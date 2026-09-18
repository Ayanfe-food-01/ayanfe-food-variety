import { CloseIcon, FilterIcon } from '../../../assets/icons'

interface FilterSheetHeaderProps {
  onClose: () => void
  isPopover?: boolean
}

export function FilterSheetHeader({ onClose, isPopover = false }: FilterSheetHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-3 border-b border-line ${isPopover ? 'px-4 py-[14px]' : 'px-[18px] py-4'}`}>
      <h2 className="m-0 inline-flex items-center gap-2 text-base font-extrabold text-green-dark">
        <FilterIcon size={18} aria-hidden="true" />
        <span>Filters</span>
      </h2>
      <button
        className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line bg-transparent text-green-dark cursor-pointer transition-colors hover:border-green"
        type="button"
        aria-label="Close filters"
        onClick={onClose}
      >
        <CloseIcon size={18} aria-hidden="true" />
      </button>
    </div>
  )
}