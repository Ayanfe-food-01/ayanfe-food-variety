import type { ReactNode } from 'react'
import { FilterBar } from '../filters/FilterBar'
import type { FilterField, FilterValues } from '../filters/filterTypes'
import type { AdminCustomersQuery, CustomerStatusFilter } from '../../types/customer'

interface CustomersFilterPanelProps {
  query: AdminCustomersQuery
  searchInput: string
  onSearchInputChange: (value: string) => void
  onApply: (next: Partial<AdminCustomersQuery>) => void
  headerActions?: ReactNode
}

const fields: FilterField[] = [
  {
    key: 'status',
    label: 'Customer status',
    type: 'select',
    quick: true,
    group: 'Activity',
    options: [
      { value: '', label: 'All customers' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
  {
    key: 'orders',
    label: 'Order count',
    type: 'select',
    group: 'Activity',
    options: [
      { value: '', label: 'Any order count' },
      { value: '1', label: '1 or more orders' },
      { value: '2', label: '2 or more orders' },
      { value: '5', label: '5 or more orders' },
      { value: '10', label: '10 or more orders' },
    ],
  },
  {
    key: 'lastOrder',
    label: 'Last ordered',
    type: 'select',
    group: 'Activity',
    options: [
      { value: '', label: 'Any time' },
      { value: '7', label: 'Within the last 7 days' },
      { value: '30', label: 'Within the last 30 days' },
      { value: '90', label: 'Within the last 90 days' },
      { value: '180', label: 'Within the last 180 days' },
      { value: 'older', label: 'Over 180 days ago' },
    ],
  },
]

export function CustomersFilterPanel({
  query,
  searchInput,
  onSearchInputChange,
  onApply,
  headerActions,
}: CustomersFilterPanelProps) {
  const committed: FilterValues = {
    status: query.status ?? '',
    orders: query.minOrders !== undefined ? String(query.minOrders) : '',
    lastOrder: query.lastOrder !== undefined ? String(query.lastOrder) : '',
  }

  const applyFilters = (next: FilterValues) => {
    onApply({
      status: (next.status || undefined) as CustomerStatusFilter | undefined,
      minOrders: next.orders ? Number(next.orders) : undefined,
      maxOrders: undefined,
      lastOrder: next.lastOrder === 'older'
        ? 'older'
        : (next.lastOrder ? Number(next.lastOrder) : undefined),
    })
  }

  return (
    <FilterBar
      fields={fields}
      committed={committed}
      onApply={applyFilters}
      search={{
        label: 'Search customers',
        value: searchInput,
        onChange: onSearchInputChange,
        onSearch: (value) => onApply({ search: value.trim() || undefined, page: 1 }),
        placeholder: 'Name, email, or phone',
      }}
      headerActions={headerActions}
    />
  )
}