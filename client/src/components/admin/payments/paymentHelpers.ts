import type { FilterField } from '../../filters/filterTypes'
import type { FilterSortOption } from '../FilterSort'
import { formatRelativeDate } from '../../../utils/dateFormat'
import type { AdminPaymentStatus, AdminPaymentsQuery } from '../../../services/paymentService'

export const formatPrice = (value: string): string =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value))

export const formatStatus = (status: AdminPaymentStatus): string =>
  status === 'VERIFIED' || status === 'SUCCESSFUL'
    ? 'Confirmed'
    : status === 'PENDING'
      ? 'Pending'
      : 'Rejected'

export const statusClass = (status: AdminPaymentStatus): string =>
  status === 'VERIFIED' || status === 'SUCCESSFUL'
    ? 'bg-green/10 text-green'
    : status === 'REJECTED'
      ? 'bg-orange/10 text-orange'
      : 'bg-sage/60 text-green-dark'

export const isConfirmed = (status: AdminPaymentStatus): boolean =>
  status === 'VERIFIED' || status === 'SUCCESSFUL'

export const isActionable = (status: AdminPaymentStatus): boolean => status === 'PENDING'

export const statusBadge = (status: AdminPaymentStatus): string => {
  const base = 'rounded-full px-2.5 py-1 font-bold'
  return `${base} ${statusClass(status)}`
}

export { formatRelativeDate }

export const paymentFilterFields: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    group: 'Status',
    options: [
      { value: '', label: 'All statuses' },
      { value: 'PENDING', label: 'Pending' },
      { value: 'CONFIRMED', label: 'Confirmed' },
      { value: 'REJECTED', label: 'Rejected' },
    ],
  },
  {
    key: 'paymentMethod',
    label: 'Method',
    type: 'select',
    group: 'Status',
    options: [
      { value: '', label: 'All methods' },
      { value: 'BANK_TRANSFER', label: 'Bank transfer' },
      { value: 'PAYSTACK', label: 'Paystack' },
    ],
  },
  {
    key: 'from',
    label: 'From',
    type: 'date',
    group: 'Date',
    placeholder: 'From date',
  },
  {
    key: 'to',
    label: 'To',
    type: 'date',
    group: 'Date',
    placeholder: 'To date',
  },
]

export const paymentSortOptions: FilterSortOption[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
]

export const applyPaymentFilter = (
  filterValues: Record<string, string>,
): Pick<AdminPaymentsQuery, 'status' | 'paymentMethod' | 'from' | 'to'> => ({
  status: (filterValues.status || undefined) as AdminPaymentsQuery['status'],
  paymentMethod: (filterValues.paymentMethod || undefined) as AdminPaymentsQuery['paymentMethod'],
  from: filterValues.from || undefined,
  to: filterValues.to || undefined,
})