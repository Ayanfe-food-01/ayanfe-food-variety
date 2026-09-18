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

const FILTER_TRIGGER =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-cream px-4 text-[13px] font-bold text-green-dark cursor-pointer transition-[border-color,box-shadow,background-color] duration-150 hover:border-green focus-visible:outline-2 focus-visible:outline-green focus-visible:outline-offset-2 [&_svg]:flex-none'

const FILTER_TRIGGER_ICON = 'relative w-11 min-w-11 rounded-[10px] p-0'

const FILTER_TRIGGER_ACTIVE = 'border-green bg-sage text-green-dark'

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
    next[key] = ''
    onApply(next)
  }

  const clearAll = () => {
    const next: FilterValues = {}
    for (const field of fields) next[field.key] = ''
    onApply(next)
  }

  return (
    <section className={`flex flex-col gap-3 ${className}`.trim()} aria-label={ariaLabel}>
      <div className="flex flex-nowrap items-end gap-2.5">
        <div className="min-w-0 flex-1">
          {search && (
            <SearchBar
              className="h-11"
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

        <div className="hidden flex-none items-center gap-2 lg:flex">
          <FilterQuickFilters className="hidden min-[1440px]:flex" fields={resolvedQuickFields} values={committed} onApply={onApply} />
          <button
            ref={desktopTriggerRef}
            className={`${FILTER_TRIGGER} ${FILTER_TRIGGER_ICON} ${activeCount > 0 ? FILTER_TRIGGER_ACTIVE : ''}`}
            type="button"
            aria-label="Open filters"
            title="Open filters"
            aria-haspopup="dialog"
            aria-expanded={isSheetOpen}
            aria-controls="filter-sheet"
            onClick={() => setIsSheetOpen(true)}
          >
            <FilterIcon size={16} aria-hidden="true" />
            {activeCount > 0 && (
              <span className="absolute -right-[7px] -top-[7px] inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-cream bg-orange px-1 text-[10px] font-extrabold text-cream">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-none items-center gap-2 lg:hidden">
          <button
            ref={mobileTriggerRef}
            className={`${FILTER_TRIGGER} ${FILTER_TRIGGER_ICON} ${activeCount > 0 ? FILTER_TRIGGER_ACTIVE : ''}`}
            type="button"
            aria-label="Open filters"
            title="Open filters"
            aria-haspopup="dialog"
            aria-expanded={isSheetOpen}
            aria-controls="filter-sheet"
            onClick={() => setIsSheetOpen(true)}
          >
            <FilterIcon size={16} aria-hidden="true" />
            {activeCount > 0 && (
              <span className="absolute -right-[7px] -top-[7px] inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-cream bg-orange px-1 text-[10px] font-extrabold text-cream">
                {activeCount}
              </span>
            )}
          </button>
        </div>
        {headerActions && <div className="flex min-w-0 flex-none items-center">{headerActions}</div>}
      </div>

      <div className="hidden">
        <FilterQuickFilters fields={resolvedQuickFields} values={committed} onApply={onApply} />
      </div>

      <div className="flex min-w-0 items-center gap-3 empty:hidden">
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