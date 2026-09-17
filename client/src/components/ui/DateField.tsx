import { createPortal } from 'react-dom'
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { ChevronDownIcon } from '../../assets/icons'
import { DateCalendar } from './date/DateCalendar'

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

  return (
    <div className={`relative min-w-0 ${className}`.trim()} ref={wrapperRef}>
      <button
        className="date-field-trigger flex h-[46px] w-full items-center justify-between gap-2.5 rounded-xl border border-line bg-cream px-[14px] text-left text-sm cursor-pointer transition-colors duration-150 hover:border-green focus-visible:outline-2 focus-visible:outline-green focus-visible:outline-offset-2"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        id={id}
        onClick={() => (isOpen ? setIsOpen(false) : openCalendar())}
        onKeyDown={handleTriggerKeyDown}
        type="button"
      >
        <span className={`min-w-0 truncate ${value ? 'text-green-dark' : 'text-muted'}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <ChevronDownIcon className={`flex-none transition-transform duration-200 ease-in-out ${isOpen ? 'rotate-180' : ''}`} size={17} aria-hidden="true" />
      </button>

      {isOpen && createPortal(
        <div
          className="date-field-panel"
          ref={menuRef}
          style={menuStyle ?? undefined}
        >
          <DateCalendar
            value={value}
            cursor={cursor}
            min={min}
            max={max}
            ariaLabel={ariaLabel}
            onDateSelect={selectDate}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
          />
          {value && (
            <div className="mt-3 flex justify-end border-t border-line pt-3">
              <button
                className="border-0 bg-transparent p-0.5 text-[12px] font-bold text-orange cursor-pointer hover:underline"
                onClick={() => { onChange(''); setIsOpen(false) }}
                type="button"
              >
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