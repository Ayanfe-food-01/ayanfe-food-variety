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
    <div className="flex min-w-0 flex-1 items-center gap-2" aria-label="Active filters">
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto whitespace-nowrap overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
          <span className="inline-flex flex-none items-center gap-2 rounded-full border border-line bg-cream px-2 py-1.5 text-xs font-semibold text-green-dark" key={key}>
            <span>{label}</span>
            <button
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-transparent text-muted cursor-pointer transition-colors hover:bg-orange hover:text-cream"
              type="button"
              aria-label={`Remove ${label} filter`}
              onClick={() => onRemove(field.key, value)}
            >
              <CloseIcon size={13} aria-hidden="true" />
            </button>
          </span>
        ))}
        <button className="flex-none border-0 bg-transparent p-0.5 text-[12px] font-bold text-orange cursor-pointer hover:underline" type="button" onClick={onClearAll}>
          Clear all
        </button>
      </div>
    </div>
  )
}