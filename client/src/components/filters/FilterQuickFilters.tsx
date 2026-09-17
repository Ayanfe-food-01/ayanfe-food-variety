import { ChevronDownIcon } from '../../assets/icons'
import { useDropdown } from '../../hooks/useDropdown'
import { Popover } from '../ui/Popover'
import type { FilterField, FilterValues } from './filterTypes'
import { getValueLabel } from './filterTypes'
import { FilterFieldControl } from './FilterFieldControl'

interface FilterQuickFiltersProps {
  fields: FilterField[]
  values: FilterValues
  onApply: (next: FilterValues) => void
  className?: string
}

export function FilterQuickFilters({ fields, values, onApply, className = '' }: FilterQuickFiltersProps) {
  if (fields.length === 0) return null

  return (
    <div className={`flex min-w-0 items-center gap-1.5${className ? ` ${className}` : ''}`} aria-label="Quick filters">
      {fields.map((field, index) => (
        <QuickFilter
          key={field.key}
          field={field}
          value={values[field.key] ?? ''}
          values={values}
          onApply={onApply}
          alignRight={index === fields.length - 1}
        />
      ))}
    </div>
  )
}

interface QuickFilterProps {
  field: FilterField
  value: string
  values: FilterValues
  onApply: (next: FilterValues) => void
  alignRight?: boolean
}

function QuickFilter({ field, value, values, onApply, alignRight = false }: QuickFilterProps) {
  const { isOpen, close, toggle, rootRef } = useDropdown()
  const valueLabel = getValueLabel(field, values)

  const handleChange = (nextValue: string) => {
    onApply({ ...values, [field.key]: nextValue })
    if (field.type === 'select') close()
  }

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <button
        className={`inline-flex min-h-[38px] max-w-[180px] items-center gap-1.5 rounded-full border pl-[13px] pr-[11px] text-xs font-bold text-green-dark cursor-pointer transition-colors hover:border-green focus-visible:outline-2 focus-visible:outline-green focus-visible:outline-offset-2 ${
          value ? 'border-green bg-sage' : 'border-line bg-cream'
        }`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={toggle}
      >
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{valueLabel || field.label}</span>
        <ChevronDownIcon size={14} aria-hidden="true" />
      </button>
      <Popover
        isOpen={isOpen}
        onClose={close}
        className={`top-[calc(100%+8px)] w-[min(300px,calc(100vw-32px))] p-2.5 ${alignRight ? 'left-auto right-0' : 'left-0'} [&_[data-filter-scroll]]:max-h-[250px]`}
        maxHeight="min(360px, 55vh)"
        surface="white"
        role="dialog"
        ariaLabel={field.label}
      >
        {() => (
          <div className="min-w-0 overflow-y-auto">
            <p className="m-0 mb-1.5 text-[11px] font-extrabold uppercase tracking-[.06em] text-muted">{field.label}</p>
            <FilterFieldControl field={field} value={value} values={values} onChange={handleChange} />
          </div>
        )}
      </Popover>
    </div>
  )
}