import type { SelectOption } from '../SelectField'

const BASE_CLASSES =
  'flex w-full min-h-[42px] items-center justify-between gap-3 border-0 rounded-[9px] px-[10px] py-2.5 text-[13px] text-left cursor-pointer transition-colors'

const SELECTED_CLASSES = 'bg-sage font-bold text-green-dark'
const DEFAULT_CLASSES = 'font-normal text-ink bg-transparent hover:text-orange data-[highlighted]:text-orange'

interface SelectMenuOptionProps {
  option: SelectOption
  index: number
  isSelected: boolean
  isHighlighted: boolean
  isDisabled: boolean
  listboxId: string
  onSelect: (option: SelectOption) => void
}

export function SelectMenuOption({
  option,
  index,
  isSelected,
  isHighlighted,
  isDisabled,
  listboxId,
  onSelect,
}: SelectMenuOptionProps) {
  return (
    <button
      aria-disabled={isDisabled}
      aria-selected={isSelected}
      className={`${BASE_CLASSES} ${isSelected ? SELECTED_CLASSES : `${DEFAULT_CLASSES} disabled:not-allowed disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:text-ink disabled:data-[highlighted]:text-ink`}`}
      data-highlighted={isHighlighted || undefined}
      disabled={isDisabled}
      id={`${listboxId}-option-${index}`}
      onClick={() => onSelect(option)}
      role="option"
      title={option.label}
      type="button"
    >
      <span className="block min-w-0 truncate">{option.label}</span>
      {isSelected && <span className="font-extrabold text-green" aria-hidden="true">✓</span>}
    </button>
  )
}