interface ProductRatingProps {
  rating: number | null | undefined
  count?: number
  className?: string
}

const STAR_PATH = 'M11.48 3.5a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.962 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z'

export function ProductRating({ rating, count, className = '' }: ProductRatingProps) {
  const reviewCount = count ?? 0
  if (rating === null || rating === undefined || rating <= 0 || reviewCount <= 0) return null

  const average = Number(rating.toFixed(1))

  return (
    <span
      className={`product-rating${className ? ` ${className}` : ''}`}
      title={`Rated ${average} out of 5 · ${reviewCount} review${reviewCount === 1 ? '' : 's'}`}
    >
      <svg aria-hidden="true" className="product-rating-star" viewBox="0 0 24 24" fill="currentColor">
        <path d={STAR_PATH} />
      </svg>
      <span className="product-rating-value">{average}</span>
      <span className="product-rating-count">({reviewCount})</span>
    </span>
  )
}
