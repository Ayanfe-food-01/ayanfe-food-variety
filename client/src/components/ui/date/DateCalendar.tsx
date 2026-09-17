import { ChevronLeftIcon, ChevronRightIcon } from '../../../assets/icons'
import { DateDay } from './DateDay'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDisplay(dateOrIso: Date | string): string {
  const date = typeof dateOrIso === 'string' ? new Date(`${dateOrIso}T00:00:00`) : dateOrIso
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

interface DateCalendarProps {
  value: string
  cursor: { year: number; month: number }
  min?: string
  max?: string
  ariaLabel?: string
  onDateSelect: (iso: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

export function DateCalendar({ value, cursor, min, max, ariaLabel, onDateSelect, onPrevMonth, onNextMonth }: DateCalendarProps) {
  const todayISO = toISODate(new Date())

  const minDate = min ? new Date(`${min}T00:00:00`) : null
  const maxDate = max ? new Date(`${max}T00:00:00`) : null
  const cursorStamp = cursor.year * 12 + cursor.month
  const prevDisabled = minDate ? cursorStamp - 1 < minDate.getFullYear() * 12 + minDate.getMonth() : false
  const nextDisabled = maxDate ? cursorStamp + 1 > maxDate.getFullYear() * 12 + maxDate.getMonth() : false

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay()
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const daysInPrevMonth = new Date(cursor.year, cursor.month, 0).getDate()

  const cells: Array<{ date: Date; inCurrentMonth: boolean }> = []
  for (let offset = firstWeekday - 1; offset >= 0; offset -= 1) {
    cells.push({ date: new Date(cursor.year, cursor.month - 1, daysInPrevMonth - offset), inCurrentMonth: false })
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(cursor.year, cursor.month, day), inCurrentMonth: true })
  }
  const totalCells = Math.ceil(cells.length / 7) * 7
  for (let day = 1; cells.length < totalCells; day += 1) {
    cells.push({ date: new Date(cursor.year, cursor.month + 1, day), inCurrentMonth: false })
  }

  const rows: Array<typeof cells> = []
  for (let index = 0; index < cells.length; index += 7) rows.push(cells.slice(index, index + 7))

  const monthLabel = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(cursor.year, cursor.month, 1))

  return (
    <div
      className="fixed z-[1000] border border-line rounded-[14px] bg-cream shadow-[0_16px_32px_rgb(20_33_22/0.18)] p-4"
      role="dialog"
      aria-label={ariaLabel ?? 'Choose date'}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          aria-label="Previous month"
          className="grid h-[30px] w-[30px] place-items-center rounded-lg border-0 bg-transparent text-muted cursor-pointer transition-colors duration-150 hover:not-disabled:bg-sage hover:not-disabled:text-green-dark disabled:cursor-not-allowed disabled:opacity-35"
          disabled={prevDisabled}
          onClick={onPrevMonth}
          type="button"
        >
          <ChevronLeftIcon size={18} aria-hidden="true" />
        </button>
        <span className="text-sm font-bold text-green-dark">{monthLabel}</span>
        <button
          aria-label="Next month"
          className="grid h-[30px] w-[30px] place-items-center rounded-lg border-0 bg-transparent text-muted cursor-pointer transition-colors duration-150 hover:not-disabled:bg-sage hover:not-disabled:text-green-dark disabled:cursor-not-allowed disabled:opacity-35"
          disabled={nextDisabled}
          onClick={onNextMonth}
          type="button"
        >
          <ChevronRightIcon size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3.5 grid grid-cols-7 gap-1" aria-hidden="true">
        {WEEKDAYS.map((weekday) => (
          <span className="text-[10px] font-bold tracking-[.08em] text-center uppercase text-muted" key={weekday}>
            {weekday}
          </span>
        ))}
      </div>

      <div className="mt-1" role="grid" aria-label={ariaLabel ?? 'Calendar'}>
        {rows.map((row, rowIndex) => (
          <div className="grid grid-cols-7 gap-1" role="row" key={`${cursor.year}-${cursor.month}-${rowIndex}`}>
            {row.map((cell) => {
              const iso = toISODate(cell.date)
              const isSelected = iso === value
              const isToday = iso === todayISO
              const isDisabled = (min !== undefined && iso < min) || (max !== undefined && iso > max)
              return (
                <DateDay
                  key={iso}
                  iso={iso}
                  date={cell.date}
                  inCurrentMonth={cell.inCurrentMonth}
                  isSelected={isSelected}
                  isToday={isToday}
                  isDisabled={isDisabled}
                  ariaLabel={formatDisplay(iso)}
                  onSelect={onDateSelect}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}