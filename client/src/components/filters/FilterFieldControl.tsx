import { CheckIcon } from '../../assets/icons'
import { useMemo, useState } from 'react'
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

  if (field.type === 'multi-select') {
    return <MultiSelectControl field={field} value={value} onChange={onChange} />
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

function MultiSelectControl({ field, value, onChange }: FilterFieldControlProps) {
  const [search, setSearch] = useState('')
  const selected = useMemo(() => new Set(value.split(',').filter(Boolean)), [value])
  const normalizedSearch = search.trim().toLowerCase()
  const options = (field.options ?? []).filter((option) =>
    option.label.toLowerCase().includes(normalizedSearch),
  )

  const toggleOption = (optionValue: string) => {
    const next = new Set(selected)
    if (next.has(optionValue)) next.delete(optionValue)
    else next.add(optionValue)
    onChange([...next].join(','))
  }

  return (
    <div className="filter-multi-select">
      {field.searchable && (
        <input
          className="filter-multi-select-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={field.placeholder ?? 'Search options'}
          aria-label={`Search ${field.label}`}
          type="search"
        />
      )}
      <div className="filter-options filter-options-scroll" role="listbox" aria-label={field.label} aria-multiselectable="true">
        {options.map((option) => {
          const isSelected = selected.has(option.value)
          return (
            <button
              className={`filter-option ${isSelected ? 'is-selected' : ''}`}
              type="button"
              role="option"
              aria-selected={isSelected}
              key={option.value}
              onClick={() => toggleOption(option.value)}
            >
              <span className="filter-option-check" aria-hidden="true">
                {isSelected && <CheckIcon size={14} />}
              </span>
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
            </button>
          )
        })}
        {options.length === 0 && <p className="filter-options-empty">No matching options</p>}
      </div>
    </div>
  )
}