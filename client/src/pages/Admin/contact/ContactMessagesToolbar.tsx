import { FilterBar } from '../../../components/filters/FilterBar'
import { FilterSort } from '../../../components/admin/FilterSort'
import type { ContactMessageStatus } from '../../../services/contactService'
import { contactFields, contactSortOptions } from './contactColumns'

interface ContactMessagesToolbarProps {
  searchInput: string
  onSearchInputChange: (value: string) => void
  onSearch: (value: string) => void
  status: ContactMessageStatus | undefined
  onStatus: (status: ContactMessageStatus | undefined) => void
  sort: 'newest' | 'oldest' | undefined
  onSort: (sort: 'newest' | 'oldest') => void
}

export function ContactMessagesToolbar({
  searchInput,
  onSearchInputChange,
  onSearch,
  status,
  onStatus,
  sort,
  onSort,
}: ContactMessagesToolbarProps) {
  return (
    <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Contact message filters">
      <FilterBar
        fields={contactFields}
        committed={{ status: status ?? '' }}
        onApply={(next) => onStatus((next.status || undefined) as ContactMessageStatus | undefined)}
        search={{
          label: 'Search contact messages',
          value: searchInput,
          onChange: onSearchInputChange,
          onSearch,
          placeholder: 'Name, email, subject, or message',
        }}
        headerActions={
          <FilterSort
            ariaLabel="Sort contact messages"
            value={sort ?? 'newest'}
            options={contactSortOptions}
            onChange={onSort}
          />
        }
      />
    </section>
  )
}