import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useProductSearchAutocomplete } from '../../hooks/useProductSearchAutocomplete'
import { SearchIcon } from '../../assets/icons'
import type { Product } from '../../types/product'

interface ProductSearchAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onSelectProduct: (product: Product) => void
  placeholder: string
  ariaLabel: string
  inputId?: string
  className?: string
  showSubmitButton?: boolean
}

export function ProductSearchAutocomplete({
  value,
  onChange,
  onSubmit,
  onSelectProduct,
  placeholder,
  ariaLabel,
  inputId,
  className = '',
  showSubmitButton = false,
}: ProductSearchAutocompleteProps) {
  const listboxId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const { suggestions, isLoading, hasError } = useProductSearchAutocomplete(value)
  const query = value.trim()
  const canShowSuggestions = query.length >= 2

  useEffect(() => {
    setActiveIndex(-1)
    setIsOpen(isFocused && canShowSuggestions && !isDismissed)
  }, [canShowSuggestions, isDismissed, isFocused, query])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsFocused(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const selectProduct = (product: Product) => {
    setIsDismissed(true)
    onChange(product.name)
    setIsOpen(false)
    setActiveIndex(-1)
    onSelectProduct(product)
  }

  const handleChange = (nextValue: string) => {
    setIsDismissed(false)
    onChange(nextValue)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || (!isLoading && !hasError && suggestions.length === 0)) {
      if (event.key === 'ArrowDown' && canShowSuggestions) setIsOpen(true)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, -1))
    } else if (event.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault()
      selectProduct(suggestions[activeIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    setIsDismissed(true)
    setIsOpen(false)
    setActiveIndex(-1)
    setIsFocused(false)
    inputRef.current?.blur()
    onSubmit(event)
  }

  return (
    <div className={`product-search-autocomplete ${className}`} ref={wrapperRef}>
      <form className="search-form" onSubmit={handleSubmit} role="search">
        <SearchIcon size={19} />
        <input
          id={inputId}
          ref={inputRef}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => {
            setIsFocused(true)
            if (canShowSuggestions) {
              setIsDismissed(false)
              setIsOpen(true)
            }
          }}
          onBlur={() => {
            setIsFocused(false)
            setIsOpen(false)
            setActiveIndex(-1)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-expanded={isOpen}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          role="combobox"
        />
        {showSubmitButton && <button type="submit">Search</button>}
      </form>
      {isOpen && canShowSuggestions && (
        <div className="product-search-dropdown" id={listboxId} role="listbox" aria-label="Product suggestions">
          {isLoading ? (
            <p className="product-search-message" role="status">Searching products…</p>
          ) : hasError ? (
            <p className="product-search-message">Suggestions are temporarily unavailable.</p>
          ) : suggestions.length > 0 ? (
            suggestions.map((product, index) => (
              <button
                className={`product-search-option ${activeIndex === index ? 'is-active' : ''}`}
                id={`${listboxId}-option-${index}`}
                key={product.id}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => selectProduct(product)}
              >
                 <span className="product-search-option-name ui-truncate" title={product.name}>{product.name}</span>
                 <span className="product-search-option-meta ui-truncate" title={`${product.category}${product.unit ? ` · ${product.unit}` : ''}`}>{product.category}{product.unit ? ` · ${product.unit}` : ''}</span>
              </button>
            ))
          ) : (
            <p className="product-search-message">No matching products found.</p>
          )}
        </div>
      )}
    </div>
  )
}