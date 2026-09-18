interface DateDayProps {
  date: Date
  iso: string
  isSelected: boolean
  isToday: boolean
  isDisabled: boolean
  inCurrentMonth: boolean
  ariaLabel: string
  onSelect: (iso: string) => void
}

export function DateDay({ date, iso, isSelected, isToday, isDisabled, inCurrentMonth, ariaLabel, onSelect }: DateDayProps) {
  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      className={`relative grid w-full aspect-square place-items-center rounded-[9px] text-[13px] transition-colors duration-150 cursor-pointer hover:not-disabled:not-aria-[pressed=true]:bg-sage disabled:cursor-not-allowed disabled:opacity-35 ${
        isSelected ? 'bg-green font-bold text-cream' : !inCurrentMonth ? 'bg-transparent text-line' : 'bg-transparent text-ink'
      } ${isToday && !isSelected ? 'shadow-[inset_0_0_0_1px_var(--color-green-dark)]' : ''}`}
      disabled={isDisabled}
      key={iso}
      onClick={() => onSelect(iso)}
      role="gridcell"
      type="button"
    >
      {date.getDate()}
    </button>
  )
}