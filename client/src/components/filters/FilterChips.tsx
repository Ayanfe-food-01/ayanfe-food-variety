import { CloseIcon } from '../../assets/icons'
import type { FilterField, FilterValues } from './filterTypes'
import { getValueLabel } from './filterTypes'

interface FilterChipsProps {
  fields: FilterField[]
  values: FilterValues
  onRemove: (key: string) => void
  onClearAll: () => void
}

export function FilterChips({ fields, values, onRemove, onClearAll }: FilterChipsProps) {
  const active = fields.filter((field) => Boolean(values[field.key]))

  if (active.length === 0) return null

  return (
    <div className="filter-chips" aria-label="Active filters">
      <div className="filter-chips-row">
        {active.map((field) => (
          <span className="filter-chip" key={field.key}>
            <span className="filter-chip-label">
              {field.label}: {getValueLabel(field, values)}
            </span>
            <button
              className="filter-chip-remove"
              type="button"
              aria-label={`Remove ${field.label} filter`}
              onClick={() => onRemove(field.key)}
            >
              <CloseIcon size={13} aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <button className="filter-chips-clear" type="button" onClick={onClearAll}>
        Clear all
      </button>
    </div>
  )
}