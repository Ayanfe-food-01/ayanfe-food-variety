import type { AnalyticsRange } from '../../../services/adminService'

const PRESETS: Array<{ key: AnalyticsRange; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'month', label: 'This month' },
  { key: 'custom', label: 'Custom range' },
]

interface AnalyticsRangeSelectorProps {
  range: AnalyticsRange
  from: string
  to: string
  onRangeChange: (range: AnalyticsRange) => void
  onFromChange: (from: string) => void
  onToChange: (to: string) => void
}

const pillClasses = (active: boolean): string =>
  `rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
    active
      ? 'bg-green text-cream'
      : 'border border-line bg-cream text-muted hover:border-green hover:text-green-dark'
  }`

const dateInputClasses =
  'rounded-lg border border-line bg-cream px-2.5 py-2 text-xs font-semibold text-green-dark focus:border-green focus:outline-none'

export function AnalyticsRangeSelector({
  range,
  from,
  to,
  onRangeChange,
  onFromChange,
  onToChange,
}: AnalyticsRangeSelectorProps) {
  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Analytics date range">
        {PRESETS.map((option) => (
          <button
            className={pillClasses(range === option.key)}
            type="button"
            aria-pressed={range === option.key}
            onClick={() => onRangeChange(option.key)}
            key={option.key}
          >
            {option.label}
          </button>
        ))}
      </div>
      {range === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-muted">
            From
            <input className={dateInputClasses} type="date" value={from} max={to || undefined} onChange={(event) => onFromChange(event.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-muted">
            To
            <input className={dateInputClasses} type="date" value={to} min={from || undefined} onChange={(event) => onToChange(event.target.value)} />
          </label>
        </div>
      )}
    </div>
  )
}