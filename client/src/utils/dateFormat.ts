const dateOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
}

const dateTimeOptions: Intl.DateTimeFormatOptions = {
  ...dateOptions,
  hour: 'numeric',
  minute: '2-digit',
}

export const formatDate = (value: string, includeTime = false): string =>
  new Intl.DateTimeFormat('en-NG', includeTime ? dateTimeOptions : dateOptions).format(new Date(value))

export const formatReviewDate = (value: string): string =>
  new Intl.DateTimeFormat('en-NG', { month: 'long', year: 'numeric' }).format(new Date(value))

const RELATIVE_DIVISORS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
]

const relativeFormatter = new Intl.RelativeTimeFormat('en-NG', { numeric: 'auto' })

export const formatRelativeDate = (value: string): string => {
  const diff = Date.now() - new Date(value).getTime()
  if (diff < 60_000) return 'just now'
  for (const { unit, ms } of RELATIVE_DIVISORS) {
    const amount = Math.floor(diff / ms)
    if (Math.abs(amount) >= 1) return relativeFormatter.format(-amount, unit)
  }
  return 'just now'
}