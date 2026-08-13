import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
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
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const selectedIndex = options.findIndex((option) => option.value === value)
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

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
        type="button"
      >
        <span className={!selectedOption ? 'select-field-placeholder' : ''}>
          {selectedOption?.label ?? 'Select an option'}
        </span>
        <ChevronDownIcon className="select-field-chevron" size={17} aria-hidden="true" />
      </button>
      {isOpen && options.length > 0 && (
        <div className="select-field-menu" id={listboxId} role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => (
            <button
              aria-selected={option.value === value}
              className={`select-field-option ${highlightedIndex === index ? 'is-highlighted' : ''} ${option.value === value ? 'is-selected' : ''}`}
              id={`${listboxId}-option-${index}`}
              key={option.value}
              onClick={() => chooseOption(option)}
              role="option"
              type="button"
            >
              <span>{option.label}</span>
              {option.value === value && <span className="select-field-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
      {required && <span className="sr-only" aria-hidden="true">Required</span>}
    </div>
  )
}