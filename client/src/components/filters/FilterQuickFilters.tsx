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
}

export function FilterQuickFilters({ fields, values, onApply }: FilterQuickFiltersProps) {
  if (fields.length === 0) return null

  return (
    <div className="filter-quick-filters" aria-label="Quick filters">
      {fields.map((field) => (
        <QuickFilter
          key={field.key}
          field={field}
          value={values[field.key] ?? ''}
          values={values}
          onApply={onApply}
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
}

function QuickFilter({ field, value, values, onApply }: QuickFilterProps) {
  const { isOpen, close, toggle, rootRef } = useDropdown()
  const valueLabel = getValueLabel(field, values)

  const handleChange = (nextValue: string) => {
    onApply({ ...values, [field.key]: nextValue })
    if (field.type === 'select') close()
  }

  return (
    <div className="filter-quick-filter" ref={rootRef}>
      <button
        className={`filter-quick-trigger ${value ? 'is-active' : ''}`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={toggle}
      >
        <span className="filter-quick-label">{valueLabel || field.label}</span>
        <ChevronDownIcon size={14} aria-hidden="true" />
      </button>
      <Popover
        isOpen={isOpen}
        onClose={close}
        className="filter-quick-menu"
        maxHeight="min(360px, 55vh)"
        surface="white"
        role="dialog"
        ariaLabel={field.label}
      >
        {() => (
          <div className="filter-quick-menu-content">
            <p className="filter-menu-label">{field.label}</p>
            <FilterFieldControl field={field} value={value} values={values} onChange={handleChange} />
          </div>
        )}
      </Popover>
    </div>
  )
}