import { ChevronDownIcon } from '../../assets/icons'
import { useDropdown } from '../../hooks/useDropdown'
import { Popover } from '../ui/Popover'
import type { FilterField, FilterValues } from './filterTypes'
import { getActiveCount } from './filterTypes'
import { FilterFieldControl } from './FilterFieldControl'

interface FilterDropdownProps {
  fields: FilterField[]
  values: FilterValues
  triggerLabel: string
  onApply: (next: FilterValues) => void
}

export function FilterDropdown({ fields, values, triggerLabel, onApply }: FilterDropdownProps) {
  const { isOpen, close, toggle, rootRef } = useDropdown()
  const activeCount = getActiveCount(fields, values)

  const handleChange = (key: string, value: string) => {
    onApply({ ...values, [key]: value })
    if (fields.length === 1) close()
  }

  return (
    <div className="relative inline-block" ref={rootRef}>
      <button
        className={`filter-trigger ${activeCount > 0 ? 'is-active' : ''}`}
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={toggle}
      >
        <span className="truncate">{triggerLabel}</span>
        {activeCount > 0 && <span className="filter-badge" aria-label={`${activeCount} active`}>{activeCount}</span>}
        <ChevronDownIcon size={14} aria-hidden="true" />
      </button>
      <Popover
        isOpen={isOpen}
        onClose={close}
        className="filter-menu left-0 top-full mt-2 min-w-56"
        ariaLabel={fields.length === 1 ? fields[0].label : triggerLabel}
      >
        {() => (
          <>
            {fields.map((field) => (
              <div key={field.key} className="filter-menu-field">
                <p className="filter-menu-label">{field.label}</p>
                <FilterFieldControl
                  field={field}
                  value={values[field.key] ?? ''}
                  onChange={(value) => handleChange(field.key, value)}
                />
              </div>
            ))}
          </>
        )}
      </Popover>
    </div>
  )
}