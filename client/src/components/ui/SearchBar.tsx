import { useEffect, useRef, type FormEvent, type InputHTMLAttributes, type Ref } from 'react'
import { CloseIcon, SearchIcon } from '../../assets/icons'
import { normalizeSearchQuery } from '../../utils/search'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch?: (query: string) => void
  liveSearch?: boolean
  debounceMs?: number
  placeholder?: string
  ariaLabel?: string
  inputId?: string
  inputRef?: Ref<HTMLInputElement>
  inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'placeholder' | 'aria-label' | 'id'
  >
  className?: string
  clearable?: boolean
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  liveSearch = true,
  debounceMs = 450,
  placeholder = 'Search…',
  ariaLabel = 'Search',
  inputId,
  inputRef,
  inputProps,
  className = '',
  clearable = false,
}: SearchBarProps) {
  const timerRef = useRef<number | null>(null)
  const lastTypedRef = useRef<string | null>(null)

  // An external value change (e.g. an autocomplete suggestion was picked)
  // means any pending live search is stale — drop it.
  useEffect(() => {
    if (value === lastTypedRef.current) return
    lastTypedRef.current = null
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [value])

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const cancelPending = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const handleChange = (next: string) => {
    onChange(next)
    lastTypedRef.current = next
    cancelPending()
    const query = normalizeSearchQuery(next)
    if (!query) {
      onSearch?.('')
      return
    }
    if (!liveSearch) return
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      onSearch?.(query)
    }, debounceMs)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    cancelPending()
    onSearch?.(normalizeSearchQuery(value))
  }

  return (
    <form
      className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-transparent bg-mist px-[13px] text-muted focus-within:border-green ${className}`}
      role="search"
      onSubmit={handleSubmit}
    >
      <SearchIcon size={19} />
      <input
        {...inputProps}
        id={inputId}
        ref={inputRef}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="min-w-0 flex-1 border-0 bg-transparent py-[13px] text-ink outline-0 [appearance:none] [-webkit-appearance:none] placeholder:text-muted [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
        type="search"
        autoComplete="off"
        spellCheck={false}
      />
      {clearable && value !== '' && (
        <button
          className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-sage p-1 text-green-dark cursor-pointer hover:text-green"
          type="button"
          aria-label="Clear search"
          onClick={() => handleChange('')}
        >
          <CloseIcon size={16} />
        </button>
      )}
    </form>
  )
}