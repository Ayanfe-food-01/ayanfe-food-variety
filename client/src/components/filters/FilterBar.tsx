import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { FilterIcon } from '../../assets/icons'
import { SearchBar } from '../ui/SearchBar'
import type { FilterField, FilterValues } from './filterTypes'
import { FilterChips } from './FilterChips'
import { FilterQuickFilters } from './FilterQuickFilters'
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
  quickFields?: FilterField[]
  headerActions?: ReactNode
  ariaLabel?: string
  className?: string
}

export function FilterBar({ fields, committed, onApply, search, quickFields, headerActions, ariaLabel = 'Filters', className = '' }: FilterBarProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const desktopTriggerRef = useRef<HTMLButtonElement>(null)
  const mobileTriggerRef = useRef<HTMLButtonElement>(null)
  const anchorRefs = useMemo(
    () => [desktopTriggerRef, mobileTriggerRef] as const,
    [],
  )

  const activeCount = fields.filter((field) => Boolean(committed[field.key])).length
  const resolvedQuickFields = quickFields ?? fields.filter((field) => field.quick)

  const removeCommitted = (key: string, value?: string) => {
    const field = fields.find((candidate) => candidate.key === key)
    if (field?.type === 'multi-select' && value) {
      const remaining = (committed[key] ?? '').split(',').filter((selectedValue) => selectedValue && selectedValue !== value)
      onApply({ ...committed, [key]: remaining.join(',') })
      return
    }

    const next = { ...committed }
    delete next[key]
    onApply(next)
  }

  const clearAll = () => {
    const next: FilterValues = {}
    for (const field of fields) next[field.key] = ''
    onApply(next)
  }

  return (
    <section className={`filter-bar ${className}`.trim()} aria-label={ariaLabel}>
      <div className="filter-bar-toolbar">
        <div className="filter-bar-search">
          {search && (
            <SearchBar
              className="filter-bar-search-input"
              value={search.value}
              onChange={search.onChange}
              onSearch={search.onSearch}
              placeholder={search.placeholder}
              ariaLabel={search.ariaLabel}
              debounceMs={search.debounceMs}
              liveSearch={Boolean(search.onSearch)}
              clearable
            />
          )}
        </div>

        <div className="filter-bar-desktop">
          <FilterQuickFilters fields={resolvedQuickFields} values={committed} onApply={onApply} />
          <button
            ref={desktopTriggerRef}
            className={`filter-trigger filter-trigger-icon ${activeCount > 0 ? 'is-active' : ''}`}
            type="button"
            aria-label="Open filters"
            title="Open filters"
            aria-haspopup="dialog"
            aria-expanded={isSheetOpen}
            aria-controls="filter-sheet"
            onClick={() => setIsSheetOpen(true)}
          >
            <FilterIcon size={16} aria-hidden="true" />
            {activeCount > 0 && <span className="filter-badge">{activeCount}</span>}
          </button>
        </div>

        <div className="filter-bar-mobile">
          <button
            ref={mobileTriggerRef}
            className={`filter-trigger filter-trigger-icon ${activeCount > 0 ? 'is-active' : ''}`}
            type="button"
            aria-label="Open filters"
            title="Open filters"
            aria-haspopup="dialog"
            aria-expanded={isSheetOpen}
            aria-controls="filter-sheet"
            onClick={() => setIsSheetOpen(true)}
          >
            <FilterIcon size={16} aria-hidden="true" />
            {activeCount > 0 && <span className="filter-badge">{activeCount}</span>}
          </button>
        </div>
        {headerActions && <div className="filter-bar-actions">{headerActions}</div>}
      </div>

      <div className="filter-bar-mobile-quick">
        <FilterQuickFilters fields={resolvedQuickFields} values={committed} onApply={onApply} />
      </div>

      <div className="filter-bar-footer">
        <FilterChips fields={fields} values={committed} onRemove={removeCommitted} onClearAll={clearAll} />
      </div>

      {isSheetOpen && (
        <FilterSheet
          onClose={() => setIsSheetOpen(false)}
          fields={fields}
          committed={committed}
          onApply={onApply}
          anchorRefs={anchorRefs}
        />
      )}
    </section>
  )
}