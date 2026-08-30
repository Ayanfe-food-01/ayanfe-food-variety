interface ReviewStarsProps {
  value: number
  size?: number
  label?: string
}

const starPath = 'M11.48 3.5a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.962 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z'

const Star = ({ size, fill }: { size: number; fill: string }) => (
  <svg
    aria-hidden="true"
    className="shrink-0"
    fill={fill}
    height={size}
    stroke={fill}
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    width={size}
  >
    <path d={starPath} />
  </svg>
)

export function ReviewStars({ value, size = 18, label }: ReviewStarsProps) {
  const clamped = Math.max(0, Math.min(5, value))
  const fillPercentage = (clamped / 5) * 100

  return (
    <span
      className="inline-flex items-center"
      role="img"
      aria-label={label ?? `${clamped.toFixed(1)} out of 5 stars`}
    >
      <span className="relative inline-flex text-line" style={{ width: size * 5, height: size }}>
        {[0, 1, 2, 3, 4].map((index) => (
          <Star size={size} fill="currentColor" key={index} />
        ))}
        <span
          className="absolute inset-y-0 left-0 overflow-hidden text-orange"
          aria-hidden="true"
          style={{ width: `${fillPercentage}%` }}
        >
          <span className="flex" style={{ width: size * 5, height: size }}>
            {[0, 1, 2, 3, 4].map((index) => (
              <Star size={size} fill="currentColor" key={index} />
            ))}
          </span>
        </span>
      </span>
    </span>
  )
}