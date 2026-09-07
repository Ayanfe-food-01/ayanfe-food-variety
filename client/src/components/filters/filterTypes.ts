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

export const getActiveFields = (fields: FilterField[], values: FilterValues): FilterField[] =>
  fields.filter((field) => Boolean(values[field.key])).sort((a, b) => fields.indexOf(a) - fields.indexOf(b))

export const getActiveCount = (fields: FilterField[], values: FilterValues): number =>
  fields.filter((field) => Boolean(values[field.key])).length

export const getActiveCountForKeys = (keys: Set<string>, values: FilterValues): number =>
  [...keys].filter((key) => Boolean(values[key])).length

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

export const createFilterValues = (
  fields: FilterField[],
  source: URLSearchParams,
): FilterValues => {
  const values: FilterValues = {}
  for (const field of fields) {
    const value = source.get(field.key)
    if (value !== null && value !== '') values[field.key] = value
  }
  return values
}

export const withoutKeys = (values: FilterValues, keys: (string | undefined)[]): FilterValues => {
  const next = { ...values }
  for (const key of keys) {
    if (key !== undefined) delete next[key]
  }
  return next
}