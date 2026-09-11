import type { AnalyticsRange } from '../../../services/adminService'

export const formatPrice = (value: string): string =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value))

export const formatNumber = (value: number): string => new Intl.NumberFormat('en-NG').format(value)

export const formatRate = (value: number | null): string => (value === null ? '—' : `${Math.round(value * 10) / 10}%`)

export const formatTrendValue = (value: number): string => (Number.isInteger(value) ? String(value) : value.toFixed(1))

export const trendLabelFor = (range: AnalyticsRange): string =>
  range === 'today'
    ? 'vs yesterday'
    : range === '7d'
      ? 'vs previous 7 days'
      : range === '30d'
        ? 'vs previous 30 days'
        : range === 'month'
          ? 'vs previous month'
          : 'vs previous period'

export const toDateInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const daysAgoInput = (days: number): string => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return toDateInput(date)
}

export const formatDateRange = (from: string, to: string): string => {
  const formatIso = (value: string) => {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
  }
  return `${formatIso(from)} – ${formatIso(to)}`
}