import { createPortal } from 'react-dom'
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { ChevronDownIcon } from '../../assets/icons'

export interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
  className?: string
  variant?: 'default' | 'filter'
  id?: string
  name?: string
  ariaLabel?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  disabled?: boolean
  required?: boolean
}

export function SelectField({
  value,
  options,
  onChange,
  className = '',
  variant = 'default',
  id,
  name,
  ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  disabled = false,
  required = false,
}: SelectFieldProps) {
  const listboxId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null)
  const selectedIndex = options.findIndex((option) => option.value === value)
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setMenuStyle(null)
      return
    }

    const updateMenuPosition = () => {
      const trigger = wrapperRef.current?.querySelector<HTMLButtonElement>('.select-field-button')
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const viewportPadding = 8
      const gap = 6
      const preferredMaxHeight = Math.min(272, window.innerHeight * 0.45)
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
      const spaceAbove = rect.top - viewportPadding
      const openBelow = spaceBelow >= Math.min(180, preferredMaxHeight) || spaceBelow >= spaceAbove
      const maxHeight = Math.max(
        96,
        Math.min(preferredMaxHeight, openBelow ? spaceBelow : spaceAbove),
      )
      const top = openBelow
        ? rect.bottom + gap
        : Math.max(viewportPadding, rect.top - maxHeight - gap)
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        Math.max(viewportPadding, window.innerWidth - rect.width - viewportPadding),
      )

      setMenuStyle({
        left,
        maxHeight,
        top,
        width: Math.min(rect.width, window.innerWidth - viewportPadding * 2),
      })
    }

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [isOpen])

  const openMenu = (startIndex = selectedIndex >= 0 ? selectedIndex : 0) => {
    if (disabled) return
    setIsOpen(true)
    setHighlightedIndex(startIndex)
  }

  const closeMenu = () => {
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const chooseOption = (option: SelectOption) => {
    onChange(option.value)
    closeMenu()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Tab') {
      closeMenu()
      return
    }

    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openMenu(event.key === 'ArrowUp' ? Math.max(options.length - 1, 0) : undefined)
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((current) => Math.min(current + 1, options.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setHighlightedIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setHighlightedIndex(Math.max(options.length - 1, 0))
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const option = options[highlightedIndex]
      if (option) chooseOption(option)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
    }
  }

  return (
    <div className={`select-field ${variant === 'filter' ? 'select-field-filter' : ''} ${className}`} ref={wrapperRef}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        aria-activedescendant={isOpen && highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined}
        aria-controls={isOpen ? listboxId : undefined}
        aria-describedby={ariaDescribedBy}
        aria-disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        className={`select-field-button ${isOpen ? 'is-open' : ''}`}
        disabled={disabled}
        id={id}
        onClick={() => (isOpen ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
         title={selectedOption?.label}
        type="button"
      >
         <span className={`ui-truncate ${!selectedOption ? 'select-field-placeholder' : ''}`.trim()}>
          {selectedOption?.label ?? 'Select an option'}
        </span>
        <ChevronDownIcon className="select-field-chevron" size={17} aria-hidden="true" />
      </button>
      {isOpen && options.length > 0 && menuStyle && createPortal(
        <div
          className="select-field-menu"
          id={listboxId}
          ref={menuRef}
          role="listbox"
          aria-label={ariaLabel}
          style={menuStyle}
        >
          {options.map((option, index) => (
            <button
              aria-selected={option.value === value}
              className={`select-field-option ${highlightedIndex === index ? 'is-highlighted' : ''} ${option.value === value ? 'is-selected' : ''}`}
              id={`${listboxId}-option-${index}`}
              key={option.value}
              onClick={() => chooseOption(option)}
              role="option"
               title={option.label}
              type="button"
            >
               <span className="ui-truncate">{option.label}</span>
              {option.value === value && <span className="select-field-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>,
        document.body,
      )}
      {required && <span className="sr-only" aria-hidden="true">Required</span>}
    </div>
  )
}