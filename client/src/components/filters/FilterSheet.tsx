import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon, FilterIcon } from '../../assets/icons'
import { useAccordion } from '../../hooks/useAccordion'
import { lockBodyScroll } from '../../utils/browserCompatibility'
import type { FilterField, FilterValues } from './filterTypes'
import { FilterFieldControl } from './FilterFieldControl'

interface FilterSheetProps {
  isOpen: boolean
  onClose: () => void
  fields: FilterField[]
  committed: FilterValues
  onApply: (next: FilterValues) => void
}

interface FieldGroup {
  key: string
  label: string
  fields: FilterField[]
}

const groupFields = (fields: FilterField[]): FieldGroup[] => {
  const groups = new Map<string, FieldGroup>()
  for (const field of fields) {
    const label = field.group ?? 'Filters'
    const group = groups.get(label) ?? { key: label, label, fields: [] }
    group.fields.push(field)
    groups.set(label, group)
  }
  return [...groups.values()]
}

export function FilterSheet({ isOpen, onClose, fields, committed, onApply }: FilterSheetProps) {
  const [draft, setDraft] = useState<FilterValues>(committed)

  useEffect(() => {
    if (!isOpen) return
    setDraft(committed)
    const release = lockBodyScroll()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      release()
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen, onClose])

  const groups = useMemo(() => groupFields(fields), [fields])
  const { isOpen: isGroupOpen, toggle: toggleGroup } = useAccordion({
    defaultOpen: groups.map((_, index) => index),
  })

  if (!isOpen) return null

  const setFieldValue = (key: string, value: string) => {
    setDraft((current) => ({ ...current, [key]: value || '' }))
  }

  const clear = () => setDraft({})

  const apply = () => {
    onApply(draft)
    onClose()
  }

  return createPortal(
    <div id="filter-sheet" className="filter-sheet" role="dialog" aria-modal="true" aria-label="Filters">
      <div className="filter-sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="filter-sheet-panel">
        <div className="filter-sheet-header">
          <h2 className="filter-sheet-title">
            <FilterIcon size={18} aria-hidden="true" />
            <span>Filters</span>
          </h2>
          <button className="filter-sheet-close" type="button" aria-label="Close filters" onClick={onClose}>
            <CloseIcon size={18} aria-hidden="true" />
          </button>
        </div>

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
                        onChange={(value) => setFieldValue(field.key, value)}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </div>

        <div className="filter-sheet-footer">
          <button className="filter-sheet-clear" type="button" onClick={clear}>
            Clear
          </button>
          <button className="filter-sheet-apply" type="button" onClick={apply}>
            Apply
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}