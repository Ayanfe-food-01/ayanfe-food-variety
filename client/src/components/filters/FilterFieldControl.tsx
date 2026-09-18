import { CheckIcon } from '../../assets/icons'
import { useMemo, useState } from 'react'
import type { FilterField, FilterValues } from './filterTypes'
import { DateField } from '../ui/DateField'

interface FilterFieldControlProps {
  field: FilterField
  value: string
  onChange: (value: string) => void
  values?: FilterValues
}

const fromToConstraint = (field: FilterField, values?: FilterValues): { min?: string; max?: string } => {
  const isPairBound = Boolean(values?.from !== undefined && values?.to !== undefined)
  if (!isPairBound) return {}
  if (field.key === 'from') return { max: values?.to || undefined }
  if (field.key === 'to') return { min: values?.from || undefined }
  return {}
}

const FILTER_OPTION =
  'flex w-full min-h-9 items-center justify-between gap-3 rounded-[9px] border-0 px-2.5 py-[7px] text-left text-[13px] cursor-pointer transition-colors'
const FILTER_OPTION_SELECTED = 'bg-sage font-bold text-green-dark'

export function FilterFieldControl({ field, value, onChange, values }: FilterFieldControlProps) {
  if (field.type === 'toggle') {
    const isOn = value === 'true'
    return (
      <button
        className={`inline-flex h-[26px] w-11 items-center rounded-full p-[3px] cursor-pointer transition-colors duration-150 ${isOn ? 'bg-green' : 'bg-line'}`}
        type="button"
        role="switch"
        aria-checked={isOn}
        onClick={() => onChange(isOn ? '' : 'true')}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-cream shadow-[0_1px_3px_rgb(20_33_22/0.25)] transition-transform duration-150 ${isOn ? 'translate-x-[18px]' : ''}`}
          aria-hidden="true"
        />
      </button>
    )
  }

  if (field.type === 'multi-select') {
    return <MultiSelectControl field={field} value={value} onChange={onChange} />
  }

  if (field.type === 'date') {
    const { min, max } = fromToConstraint(field, values)
    return (
      <DateField
        className="w-full"
        ariaLabel={field.label}
        placeholder={field.placeholder ?? 'Select a date'}
        value={value}
        min={min}
        max={max}
        onChange={onChange}
      />
    )
  }

  const handleSelect = (optionValue: string) => {
    onChange(optionValue === value ? '' : optionValue)
  }

  return (
    <div className="flex flex-col gap-0.5" role="listbox" aria-label={field.label}>
      {field.options?.map((option) => {
        const isSelected = option.value === value
        return (
          <button
            className={`${FILTER_OPTION} ${isSelected ? FILTER_OPTION_SELECTED : 'bg-transparent text-ink hover:text-orange'}`}
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
    <div className="flex flex-col gap-2">
      {field.searchable && (
        <input
          className="w-full min-h-[38px] rounded-[10px] border border-line bg-cream px-[11px] text-[13px] text-ink focus:border-green focus:outline-2 focus:outline-[rgb(50_91_57/0.15)]"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={field.placeholder ?? 'Search options'}
          aria-label={`Search ${field.label}`}
          type="search"
        />
      )}
      <div data-filter-scroll className="flex max-h-[330px] flex-col gap-0.5 overflow-y-auto overscroll-contain" role="listbox" aria-label={field.label} aria-multiselectable="true">
        {options.map((option) => {
          const isSelected = selected.has(option.value)
          return (
            <button
              className={`${FILTER_OPTION} ${isSelected ? FILTER_OPTION_SELECTED : 'bg-transparent text-ink hover:text-orange'}`}
              type="button"
              role="option"
              aria-selected={isSelected}
              key={option.value}
              onClick={() => toggleOption(option.value)}
            >
              <span
                className={`inline-flex h-[17px] w-[17px] flex-none items-center justify-center rounded-[4px] border text-cream ${isSelected ? 'border-green bg-green' : 'border-line'}`}
                aria-hidden="true"
              >
                {isSelected && <CheckIcon size={14} />}
              </span>
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
            </button>
          )
        })}
        {options.length === 0 && <p className="m-0 px-2.5 py-3.5 text-xs text-muted">No matching options</p>}
      </div>
    </div>
  )
}