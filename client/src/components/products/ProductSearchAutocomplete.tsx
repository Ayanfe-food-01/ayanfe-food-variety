import { useEffect, useId, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import { useProductSearchAutocomplete } from '../../hooks/useProductSearchAutocomplete'
import { SearchBar } from '../ui/SearchBar'
import type { Product } from '../../types/product'

interface ProductSearchAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => void
  onSelectProduct: (product: Product) => void
  placeholder: string
  ariaLabel: string
  liveSearch?: boolean
  inputRef?: Ref<HTMLInputElement>
  inputId?: string
  className?: string
}

export function ProductSearchAutocomplete({
  value,
  onChange,
  onSearch,
  onSelectProduct,
  placeholder,
  ariaLabel,
  liveSearch = true,
  inputRef,
  inputId,
  className = '',
}: ProductSearchAutocompleteProps) {
  const listboxId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isFocused, setIsFocused] = useState(false)
  const { suggestions, isLoading, hasError } = useProductSearchAutocomplete(value)
  const query = value.trim()
  const canShowSuggestions = query.length >= 2

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
    onChange(product.name)
    setIsOpen(false)
    setActiveIndex(-1)
    setIsFocused(false)
    onSelectProduct(product)
  }

  const handleChange = (nextValue: string) => {
    setActiveIndex(-1)
    if (nextValue.trim().length >= 2) {
      if (isFocused) setIsOpen(true)
    } else {
      setIsOpen(false)
    }
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

  return (
    <div className={`product-search-autocomplete ${className}`} ref={wrapperRef}>
      <SearchBar
        value={value}
        onChange={handleChange}
        onSearch={onSearch}
        liveSearch={liveSearch}
        placeholder={placeholder}
        ariaLabel={ariaLabel}
        inputId={inputId}
        inputRef={inputRef}
        clearable
        inputProps={{
          role: 'combobox',
          'aria-autocomplete': 'list',
          'aria-controls': isOpen ? listboxId : undefined,
          'aria-expanded': isOpen,
          'aria-activedescendant': activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined,
          onFocus: () => {
            setIsFocused(true)
            if (canShowSuggestions) setIsOpen(true)
          },
          onBlur: () => {
            setIsFocused(false)
            setIsOpen(false)
            setActiveIndex(-1)
          },
          onKeyDown: handleKeyDown,
        }}
      />
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
                 <span className="product-search-option-name block min-w-0 truncate" title={product.name}>{product.name}</span>
                 <span className="product-search-option-meta block min-w-0 truncate" title={`${product.category}${product.unit ? ` · ${product.unit}` : ''}`}>{product.category}{product.unit ? ` · ${product.unit}` : ''}</span>
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