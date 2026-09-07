import { useState } from 'react'
import { SearchBar } from '../ui/SearchBar'
import type { FilterField, FilterValues } from './filterTypes'
import { getValueLabel } from './filterTypes'
import { FilterChips } from './FilterChips'
import { FilterDropdown } from './FilterDropdown'
import { FilterSheet } from './FilterSheet'

interface FilterBarSearch {
  label?: string
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => void
  placeholder?: string
  ariaLabel?: string
  debounceMs?: number
}

interface FilterBarProps {
  fields: FilterField[]
  committed: FilterValues
  onApply: (next: FilterValues) => void
  search?: FilterBarSearch
  ariaLabel?: string
  className?: string
}

export function FilterBar({ fields, committed, onApply, search, ariaLabel = 'Filters', className = '' }: FilterBarProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const inlineFields = fields.filter((field) => field.inline)
  const overflowFields = fields.filter((field) => !field.inline)
  const activeCount = fields.filter((field) => Boolean(committed[field.key])).length

  const removeCommitted = (key: string) => {
    const next = { ...committed }
    delete next[key]
    onApply(next)
  }

  const clearAll = () => {
    const next: FilterValues = {}
    for (const field of fields) next[field.key] = ''
    onApply(next)
  }

  const singleFieldLabel = (field: FilterField): string => {
    const value = getValueLabel(field, committed)
    return value ? `${field.label}: ${value}` : field.label
  }

  return (
    <section className={`filter-bar ${className}`.trim()} aria-label={ariaLabel}>
      <div className="filter-bar-toolbar">
        <div className="filter-bar-search">
          {search && (
            <label className="filter-bar-search-label">
              {search.label ?? search.ariaLabel ?? 'Search'}
              <SearchBar
                className="filter-bar-search-input mt-2"
                value={search.value}
                onChange={search.onChange}
                onSearch={search.onSearch}
                placeholder={search.placeholder}
                ariaLabel={search.ariaLabel}
                debounceMs={search.debounceMs}
                liveSearch={Boolean(search.onSearch)}
              />
            </label>
          )}
        </div>

        <div className="filter-bar-desktop">
          {inlineFields.map((field) => (
            <FilterDropdown
              key={field.key}
              fields={[field]}
              values={committed}
              triggerLabel={singleFieldLabel(field)}
              onApply={onApply}
            />
          ))}
          {overflowFields.length > 0 && (
            <FilterDropdown
              fields={overflowFields}
              values={committed}
              triggerLabel="More filters"
              onApply={onApply}
            />
          )}
        </div>

        <div className="filter-bar-mobile">
          <button
            className={`filter-trigger ${activeCount > 0 ? 'is-active' : ''} w-full`}
            type="button"
            aria-haspopup="dialog"
            onClick={() => setIsSheetOpen(true)}
          >
            <span>Filters</span>
            {activeCount > 0 && <span className="filter-badge">{activeCount}</span>}
          </button>
        </div>
      </div>

      <FilterChips fields={fields} values={committed} onRemove={removeCommitted} onClearAll={clearAll} />

      <FilterSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        fields={fields}
        committed={committed}
        onApply={onApply}
      />
    </section>
  )
}