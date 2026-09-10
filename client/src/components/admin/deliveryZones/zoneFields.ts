import type { FilterField } from '../../filters/filterTypes'

export const zoneFields: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    quick: true,
    group: 'Status',
    options: [
      { value: '', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
]

export const formatCurrency = (value?: string | null) => {
  if (!value) return '—'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return value
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(numeric)
}