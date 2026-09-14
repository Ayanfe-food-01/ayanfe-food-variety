import type { FilterField } from '../../../components/filters/filterTypes'
import type { FilterSortOption } from '../../../components/admin/FilterSort'
import { CONTACT_STATUSES, formatContactStatus } from './contactStatus'

export const pageSize = 10

export const contactFields: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    quick: true,
    group: 'Status',
    options: [
      { value: '', label: 'All statuses' },
      ...CONTACT_STATUSES.map((status) => ({ value: status, label: formatContactStatus(status) })),
    ],
  },
]

export const contactSortOptions: FilterSortOption<'newest' | 'oldest'>[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
]