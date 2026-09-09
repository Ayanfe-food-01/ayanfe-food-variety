import { CloseIcon } from '../../assets/icons'
import type { FilterField, FilterValues } from './filterTypes'
import { getValueLabel } from './filterTypes'

interface FilterChipsProps {
  fields: FilterField[]
  values: FilterValues
  onRemove: (key: string, value?: string) => void
  onClearAll: () => void
}

export function FilterChips({ fields, values, onRemove, onClearAll }: FilterChipsProps) {
  const active = fields.filter((field) => Boolean(values[field.key]))

  if (active.length === 0) return null

  return (
    <div className="filter-chips" aria-label="Active filters">
      <div className="filter-chips-row">
        {active.flatMap((field) => {
          if (field.type !== 'multi-select') {
            return [{
              key: field.key,
              value: values[field.key],
              label: `${field.label}: ${getValueLabel(field, values)}`,
              field,
            }]
          }

          const selectedValues = values[field.key].split(',').filter(Boolean)
          return selectedValues.map((value) => ({
            key: `${field.key}-${value}`,
            value,
            label: field.options?.find((option) => option.value === value)?.label ?? value,
            field,
          }))
        }).map(({ key, value, label, field }) => (
          <span className="filter-chip" key={key}>
            <span className="filter-chip-label">{label}</span>
            <button
              className="filter-chip-remove"
              type="button"
              aria-label={`Remove ${label} filter`}
              onClick={() => onRemove(field.key, value)}
            >
              <CloseIcon size={13} aria-hidden="true" />
            </button>
          </span>
        ))}
        <button className="filter-chips-clear" type="button" onClick={onClearAll}>
          Clear all
        </button>
      </div>
    </div>
  )
}