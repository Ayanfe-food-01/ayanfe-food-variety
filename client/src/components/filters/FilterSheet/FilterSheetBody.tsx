import { useMemo } from 'react'
import { useAccordion } from '../../../hooks/useAccordion'
import type { FilterField, FilterValues } from '../filterTypes'
import { FilterFieldControl } from '../FilterFieldControl'

interface FilterSheetBodyProps {
  fields: FilterField[]
  draft: FilterValues
  onFieldChange: (key: string, value: string) => void
  isPopover?: boolean
}

export function FilterSheetBody({ fields, draft, onFieldChange, isPopover = false }: FilterSheetBodyProps) {
  const initiallyOpen = useMemo(
    () => fields.reduce<number[]>((open, field, index) => {
      if (draft[field.key]) open.push(index)
      return open
    }, []),
    [fields, draft],
  )
  const { isOpen: isFieldOpen, toggle: toggleField } = useAccordion({ defaultOpen: initiallyOpen })

  return (
    <div
      className={`flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable] ${isPopover ? 'px-4 py-1' : 'px-[18px] pt-1.5 pb-1'} [&_[data-filter-scroll]]:overscroll-y-auto`}
    >
      {fields.map((field, index) => {
        const isOpen = isFieldOpen(index)
        const isStacked = field.type !== 'toggle'
        return (
          <section className="border-b border-line last:border-b-0" key={field.key}>
            <button
              className="flex w-full items-center justify-between gap-3 border-0 bg-transparent py-[14px] text-[13px] font-extrabold text-green-dark cursor-pointer transition-colors hover:text-orange"
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggleField(index)}
            >
              <span>{field.label}</span>
              <span
                className={`h-2 w-2 border-r-2 border-b-2 border-current transition-transform duration-200 ${isOpen ? 'rotate-45' : '-rotate-45'}`}
                aria-hidden="true"
              />
            </button>
            {isOpen && (
              <div className="pt-0.5 pb-3">
                <div className={`flex items-center justify-between gap-3 py-2.5 not-first:border-t not-first:border-line ${isStacked ? 'flex-col items-stretch gap-2.5' : ''}`}>
                  <FilterFieldControl
                    field={field}
                    value={draft[field.key] ?? ''}
                    values={draft}
                    onChange={(value) => onFieldChange(field.key, value)}
                  />
                </div>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}