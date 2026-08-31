import { useState, type KeyboardEvent } from 'react'

interface StarRatingProps {
  value: number
  onChange: (rating: number) => void
  disabled?: boolean
  error?: string
}

const starLabels = ['1 star', '2 stars', '3 stars', '4 stars', '5 stars']

export function StarRating({ value, onChange, disabled = false, error }: StarRatingProps) {
  const [preview, setPreview] = useState(0)
  const shown = preview || value

  const selectStar = (rating: number) => {
    if (disabled) return
    onChange(rating)
    setPreview(0)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const next = event.key === 'ArrowLeft'
      ? Math.max(1, value - 1)
      : event.key === 'ArrowRight'
        ? Math.min(5, value + 1)
        : event.key === 'Home'
          ? 1
          : 5
    onChange(next)
  }

  return (
    <div>
      <div
        className="flex items-center gap-2"
        role="radiogroup"
        aria-label="Your rating"
        aria-required="true"
        onKeyDown={handleKeyDown}
      >
        {[1, 2, 3, 4, 5].map((rating) => {
          const filled = rating <= shown
          return (
            <button
              aria-checked={value === rating}
              aria-label={`${starLabels[rating - 1]}${value === rating ? ', selected' : ''}`}
              className={`flex size-12 items-center justify-center rounded-2xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green/40 disabled:cursor-not-allowed disabled:opacity-50 ${
                filled ? 'text-orange' : 'text-line hover:text-orange/50'
              }`}
              disabled={disabled}
              key={rating}
              role="radio"
              type="button"
              onBlur={() => setPreview(0)}
              onClick={() => selectStar(rating)}
              onFocus={() => setPreview(rating)}
              onMouseEnter={() => { if (!disabled) setPreview(rating) }}
              onMouseLeave={() => setPreview(0)}
            >
              <svg aria-hidden="true" className="size-9" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M11.48 3.5a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.962 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
              </svg>
            </button>
          )
        })}
      </div>
      <p className="mt-1 h-4 text-xs font-normal text-muted" aria-live="polite">
        {value ? `${value} ${value === 1 ? 'star' : 'stars'} selected` : 'Select a rating'}
      </p>
      {error && <p className="mt-2 text-xs font-normal text-orange" role="alert">{error}</p>}
    </div>
  )
}