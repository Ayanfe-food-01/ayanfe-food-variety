import { createPortal } from 'react-dom'
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '../../assets/icons'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const parseISO = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDisplay = (value: string): string => {
  const date = parseISO(value)
  if (!date) return ''
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

interface DateFieldProps {
  value: string
  onChange: (value: string) => void
  id?: string
  className?: string
  placeholder?: string
  min?: string
  max?: string
  ariaLabel?: string
}

export function DateField({
  value,
  onChange,
  id,
  className = '',
  placeholder = 'Select a date',
  min,
  max,
  ariaLabel,
}: DateFieldProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null)
  const [cursor, setCursor] = useState<{ year: number; month: number }>(() => {
    const initial = parseISO(value) ?? new Date()
    return { year: initial.getFullYear(), month: initial.getMonth() }
  })

  const selectedDate = parseISO(value)
  const todayISO = toISODate(new Date())

  const openCalendar = () => {
    if (selectedDate) {
      setCursor({ year: selectedDate.getFullYear(), month: selectedDate.getMonth() })
    }
    setIsOpen(true)
  }

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const updateMenuPosition = () => {
      const trigger = wrapperRef.current?.querySelector<HTMLElement>('.date-field-trigger')
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const viewportPadding = 8
      const gap = 6
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth
      const panelWidth = Math.min(288, viewportWidth - viewportPadding * 2)
      const panelHeight = 330
      const spaceBelow = viewportHeight - rect.bottom - viewportPadding
      const spaceAbove = rect.top - viewportPadding
      const openBelow = spaceBelow >= panelHeight || spaceBelow >= spaceAbove
      const top = openBelow
        ? rect.bottom + gap
        : Math.max(viewportPadding, rect.top - panelHeight - gap)
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        Math.max(viewportPadding, viewportWidth - panelWidth - viewportPadding),
      )

      setMenuStyle({ left, top, width: panelWidth })
    }

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    window.visualViewport?.addEventListener('resize', updateMenuPosition)
    window.visualViewport?.addEventListener('scroll', updateMenuPosition)
    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
      window.visualViewport?.removeEventListener('resize', updateMenuPosition)
      window.visualViewport?.removeEventListener('scroll', updateMenuPosition)
    }
  }, [isOpen])

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Tab') {
      setIsOpen(false)
      return
    }
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openCalendar()
      }
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
    }
  }

  const selectDate = (iso: string) => {
    onChange(iso)
    setIsOpen(false)
  }

  const prevMonth = () => {
    setCursor(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }))
  }

  const nextMonth = () => {
    setCursor(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }))
  }

  const minDate = min ? parseISO(min) : null
  const maxDate = max ? parseISO(max) : null
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
    <div className={`date-field ${className}`.trim()} ref={wrapperRef}>
      <button
        className={`date-field-trigger ${value ? 'has-value' : ''} ${isOpen ? 'is-open' : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        id={id}
        onClick={() => (isOpen ? setIsOpen(false) : openCalendar())}
        onKeyDown={handleTriggerKeyDown}
        type="button"
      >
        <span className={value ? 'date-field-value' : 'date-field-placeholder'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <ChevronDownIcon className="date-field-chevron" size={17} aria-hidden="true" />
      </button>

      {isOpen && createPortal(
        <div
          className="date-field-panel"
          role="dialog"
          aria-label={ariaLabel ?? 'Choose date'}
          ref={menuRef}
          style={menuStyle ?? undefined}
        >
          <div className="date-field-nav">
            <button
              aria-label="Previous month"
              className="date-field-nav-button"
              disabled={prevDisabled}
              onClick={prevMonth}
              type="button"
            >
              <ChevronLeftIcon size={18} aria-hidden="true" />
            </button>
            <span className="date-field-month">{monthLabel}</span>
            <button
              aria-label="Next month"
              className="date-field-nav-button"
              disabled={nextDisabled}
              onClick={nextMonth}
              type="button"
            >
              <ChevronRightIcon size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="date-field-weekdays" aria-hidden="true">
            {WEEKDAYS.map((weekday) => <span className="date-field-weekday" key={weekday}>{weekday}</span>)}
          </div>

          <div className="date-field-grid" role="grid" aria-label="Calendar">
            {rows.map((row, rowIndex) => (
              <div className="date-field-row" role="row" key={`${cursor.year}-${cursor.month}-${rowIndex}`}>
                {row.map((cell) => {
                  const iso = toISODate(cell.date)
                  const isSelected = iso === value
                  const isToday = iso === todayISO
                  const isDisabled = (min !== undefined && iso < min) || (max !== undefined && iso > max)
                  return (
                    <button
                      aria-label={formatDisplay(iso)}
                      aria-pressed={isSelected}
                      className={`date-field-day ${!cell.inCurrentMonth ? 'is-muted' : ''} ${isSelected ? 'is-selected' : ''} ${isToday && !isSelected ? 'is-today' : ''}`}
                      disabled={isDisabled}
                      key={iso}
                      onClick={() => selectDate(iso)}
                      role="gridcell"
                      type="button"
                    >
                      {cell.date.getDate()}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {value && (
            <div className="date-field-footer">
              <button className="date-field-clear" onClick={() => { onChange(''); setIsOpen(false) }} type="button">
                Clear
              </button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}