import { CheckIcon } from '../../assets/icons'
import type { FilterField } from './filterTypes'

interface FilterFieldControlProps {
  field: FilterField
  value: string
  onChange: (value: string) => void
}

export function FilterFieldControl({ field, value, onChange }: FilterFieldControlProps) {
  if (field.type === 'toggle') {
    const isOn = value === 'true'
    return (
      <button
        className={`filter-toggle ${isOn ? 'is-on' : ''}`}
        type="button"
        role="switch"
        aria-checked={isOn}
        onClick={() => onChange(isOn ? '' : 'true')}
      >
        <span className="filter-toggle-track" aria-hidden="true" />
      </button>
    )
  }

  const handleSelect = (optionValue: string) => {
    onChange(optionValue === value ? '' : optionValue)
  }

  return (
    <div className="filter-options" role="listbox" aria-label={field.label}>
      {field.options?.map((option) => {
        const isSelected = option.value === value
        return (
          <button
            className={`filter-option ${isSelected ? 'is-selected' : ''}`}
            type="button"
            role="option"
            aria-selected={isSelected}
            key={option.value}
            onClick={() => handleSelect(option.value)}
          >
            <span className="min-w-0 truncate">{option.label}</span>
            {isSelected && <CheckIcon size={15} aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}