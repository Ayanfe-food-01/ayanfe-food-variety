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
  variant?: 'default' | 'filter' | 'compact'
  id?: string
  name?: string
  ariaLabel?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  disabled?: boolean
  required?: boolean
  disabledOptions?: readonly string[]
  searchable?: boolean
  placeholder?: string
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
  disabledOptions = [],
  searchable = false,
  placeholder = 'Select an option',
}: SelectFieldProps) {
  const listboxId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null)
  const [query, setQuery] = useState('')
  const [prevValue, setPrevValue] = useState(value)

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined

  const listOptions = searchable ? options.filter((option) => option.value !== '') : options

  const normalizedQuery = searchable ? query.trim().toLowerCase() : ''
  const filteredOptions = searchable && normalizedQuery
    ? listOptions.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
    : listOptions

  const activeOptions = searchable ? filteredOptions : options

  const isOptionIndexDisabled = (index: number) => {
    const option = activeOptions[index]
    return !option || disabledOptions.includes(option.value)
  }

  const clampToEnabledIndex = (index: number) => {
    if (activeOptions.length === 0) return -1
    for (let offset = 0; offset < activeOptions.length; offset += 1) {
      const candidate = index + offset
      if (candidate < activeOptions.length && !isOptionIndexDisabled(candidate)) return candidate
    }
    for (let offset = 1; offset < activeOptions.length; offset += 1) {
      const candidate = index - offset
      if (candidate >= 0 && !isOptionIndexDisabled(candidate)) return candidate
    }
    return -1
  }

  const nextEnabledIndex = (start: number, direction: 1 | -1) => {
    let index = start
    for (let step = 0; step < activeOptions.length; step += 1) {
      index = (index + direction + activeOptions.length) % activeOptions.length
      if (!isOptionIndexDisabled(index)) return index
    }
    return -1
  }

  if (searchable && prevValue !== value) {
    setPrevValue(value)
    if (query !== '') {
      const option = options.find((candidate) => candidate.value === value)
      setQuery(option ? option.label : '')
    }
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
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const updateMenuPosition = () => {
      const trigger = wrapperRef.current?.querySelector<HTMLElement>('.select-field-button')
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const viewportPadding = 8
      const gap = 6
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth
      const preferredMaxHeight = Math.min(272, viewportHeight * 0.45)
      const spaceBelow = viewportHeight - rect.bottom - viewportPadding
      const spaceAbove = rect.top - viewportPadding
      const openBelow = spaceBelow >= Math.min(180, preferredMaxHeight) || spaceBelow >= spaceAbove
      const menuWidth = Math.min(
        Math.max(rect.width, variant === 'compact' ? 184 : rect.width),
        viewportWidth - viewportPadding * 2,
      )
      const maxHeight = Math.max(
        96,
        Math.min(preferredMaxHeight, openBelow ? spaceBelow : spaceAbove),
      )
      const top = openBelow
        ? rect.bottom + gap
        : Math.max(viewportPadding, rect.top - maxHeight - gap)
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        Math.max(viewportPadding, viewportWidth - menuWidth - viewportPadding),
      )

      setMenuStyle({
        left,
        maxHeight,
        top,
        width: menuWidth,
      })
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
  }, [isOpen, variant])

  const openMenu = (startIndex = selectedIndex >= 0 ? selectedIndex : 0) => {
    if (disabled) return
    setIsOpen(true)
    setHighlightedIndex(clampToEnabledIndex(startIndex))
  }

  const closeMenu = () => {
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const chooseOption = (option: SelectOption) => {
    if (disabledOptions.includes(option.value)) return
    if (searchable) setQuery(option.label)
    onChange(option.value)
    closeMenu()
  }

  const handleButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Tab') {
      closeMenu()
      return
    }

    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openMenu(event.key === 'ArrowUp' ? Math.max(activeOptions.length - 1, 0) : undefined)
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((current) => nextEnabledIndex(current, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((current) => nextEnabledIndex(current, -1))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setHighlightedIndex(clampToEnabledIndex(0))
    } else if (event.key === 'End') {
      event.preventDefault()
      setHighlightedIndex(clampToEnabledIndex(activeOptions.length - 1))
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const option = activeOptions[highlightedIndex]
      if (option) chooseOption(option)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
    }
  }

  const handleSearchableKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Tab') {
      closeMenu()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!isOpen) openMenu()
      setHighlightedIndex((current) => nextEnabledIndex(current, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) openMenu()
      setHighlightedIndex((current) => nextEnabledIndex(current, -1))
    } else if (event.key === 'Enter') {
      if (!isOpen) {
        openMenu()
        return
      }
      event.preventDefault()
      const option = activeOptions[highlightedIndex >= 0 ? highlightedIndex : 0]
      if (option) chooseOption(option)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
    }
  }

  const handleSearchableChange = (next: string) => {
    setQuery(next)
    if (next.trim() !== selectedOption?.label) {
      onChange('')
      setPrevValue('')
      if (!isOpen) openMenu(0)
    }
    setHighlightedIndex(-1)
  }

  const effectiveMenuStyle = isOpen ? menuStyle : null
  const menuOpen = isOpen && activeOptions.length > 0 && effectiveMenuStyle

  return (
    <div className={`select-field ${variant === 'filter' ? 'select-field-filter' : ''} ${variant === 'compact' ? 'select-field-compact' : ''} ${className}`} ref={wrapperRef}>
      {name && <input type="hidden" name={name} value={value} />}
      {searchable ? (
        <input
          aria-activedescendant={isOpen && highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined}
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel}
          className={`select-field-button select-field-input ${isOpen ? 'is-open' : ''}`}
          disabled={disabled}
          id={id}
          onKeyDown={handleSearchableKeyDown}
          onChange={(event) => handleSearchableChange(event.target.value)}
          onFocus={() => openMenu(0)}
          placeholder={placeholder}
          role="combobox"
          value={query}
          autoComplete="off"
          spellCheck={false}
        />
      ) : (
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
          onKeyDown={handleButtonKeyDown}
          title={selectedOption?.label}
          type="button"
        >
          <span className={`block min-w-0 truncate ${!selectedOption ? 'select-field-placeholder' : ''}`.trim()}>
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronDownIcon className="select-field-chevron" size={17} aria-hidden="true" />
        </button>
      )}
      {menuOpen && createPortal(
        <div
          className={`select-field-menu modal-scroll ${variant === 'compact' ? 'select-field-menu-compact' : ''}`}
          id={listboxId}
          ref={menuRef}
          role="listbox"
          aria-label={ariaLabel}
          style={effectiveMenuStyle}
        >
          {activeOptions.map((option, index) => (
            <button
              aria-disabled={disabledOptions.includes(option.value)}
              aria-selected={option.value === value}
              className={`select-field-option ${highlightedIndex === index ? 'is-highlighted' : ''} ${option.value === value ? 'is-selected' : ''} ${disabledOptions.includes(option.value) ? 'is-disabled' : ''}`}
              disabled={disabledOptions.includes(option.value)}
              id={`${listboxId}-option-${index}`}
              key={option.value}
              onClick={() => chooseOption(option)}
              role="option"
              title={option.label}
              type="button"
            >
              <span className="block min-w-0 truncate">{option.label}</span>
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