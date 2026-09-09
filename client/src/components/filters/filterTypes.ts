export interface FilterOption {
  value: string
  label: string
}

export type FilterFieldType = 'select' | 'multi-select' | 'toggle'

export interface FilterField {
  key: string
  label: string
  type: FilterFieldType
  options?: FilterOption[]
  inline?: boolean
  quick?: boolean
  searchable?: boolean
  group?: string
  placeholder?: string
}

export type FilterValues = Record<string, string>

export const getValueLabel = (field: FilterField, values: FilterValues): string => {
  const value = values[field.key]
  if (!value) return ''
  if (field.type === 'toggle') return value === 'true' ? 'Yes' : 'No'
  if (field.type === 'multi-select') {
    const selected = new Set(value.split(',').filter(Boolean))
    return (field.options ?? [])
      .filter((option) => selected.has(option.value))
      .map((option) => option.label)
      .join(', ')
  }
  return field.options?.find((option) => option.value === value)?.label ?? value
}