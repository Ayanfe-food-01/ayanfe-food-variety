interface SegmentedControlOption {
  key: string
  label: string
}

interface SegmentedControlProps {
  ariaLabel: string
  options: SegmentedControlOption[]
  value: string
  onChange: (key: string) => void
  className?: string
}

export function SegmentedControl({ ariaLabel, options, value, onChange, className = '' }: SegmentedControlProps) {
  return (
    <div className={`segmented-control ${className}`.trim()} role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          className={`segmented-control-segment${value === option.key ? ' is-active' : ''}`}
          type="button"
          role="tab"
          aria-selected={value === option.key}
          key={option.key}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}