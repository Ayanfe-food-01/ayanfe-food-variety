import { useMemo } from 'react'
import { useAccordion } from '../../../hooks/useAccordion'
import type { FilterField, FilterValues } from '../filterTypes'
import { FilterFieldControl } from '../FilterFieldControl'

interface FieldGroup {
  key: string
  label: string
  fields: FilterField[]
}

interface FilterSheetBodyProps {
  fields: FilterField[]
  draft: FilterValues
  onFieldChange: (key: string, value: string) => void
}

function groupFields(fields: FilterField[]): FieldGroup[] {
  const groups = new Map<string, FieldGroup>()
  for (const field of fields) {
    const label = field.group ?? 'Filters'
    const group = groups.get(label) ?? { key: label, label, fields: [] }
    group.fields.push(field)
    groups.set(label, group)
  }
  return [...groups.values()]
}

export function FilterSheetBody({ fields, draft, onFieldChange }: FilterSheetBodyProps) {
  const groups = useMemo(() => groupFields(fields), [fields])
  const { isOpen: isGroupOpen, toggle: toggleGroup } = useAccordion({ defaultOpen: [] })

  return (
    <div className="filter-sheet-body">
      {groups.map((group, index) => (
        <section className="filter-sheet-group" key={group.key}>
          {groups.length > 1 && (
            <button
              className="filter-sheet-group-toggle"
              type="button"
              aria-expanded={isGroupOpen(index)}
              onClick={() => toggleGroup(index)}
            >
              <span>{group.label}</span>
              <span className="filter-sheet-group-caret" aria-hidden="true" />
            </button>
          )}
          {groups.length === 1 || isGroupOpen(index) ? (
            <div className="filter-sheet-group-body">
              {group.fields.map((field) => (
                <div
                  className={`filter-sheet-field ${field.type !== 'toggle' ? 'is-stacked' : ''}`}
                  key={field.key}
                >
                  <p className="filter-sheet-field-label">{field.label}</p>
                  <FilterFieldControl
                    field={field}
                    value={draft[field.key] ?? ''}
                    onChange={(value) => onFieldChange(field.key, value)}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  )
}