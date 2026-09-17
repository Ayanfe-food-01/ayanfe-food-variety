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
    <div className={`flex h-11 w-full min-w-0 items-stretch overflow-hidden rounded-xl border border-line bg-cream ${className}`.trim()} role="tablist" aria-label={ariaLabel}>
      {options.map((option) => {
        const isActive = value === option.key
        return (
          <button
            className={`flex min-w-0 flex-1 items-center justify-center whitespace-nowrap border-0 px-[14px] text-center text-sm transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-green focus-visible:outline-offset-[-2px] not-first:border-l not-first:border-l-line ${
              isActive ? 'bg-green font-semibold text-cream' : 'bg-transparent font-normal text-muted hover:text-green'
            }`}
            type="button"
            role="tab"
            aria-selected={isActive}
            key={option.key}
            onClick={() => onChange(option.key)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}