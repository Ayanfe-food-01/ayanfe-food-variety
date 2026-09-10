import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../services/api'
import {
  getAdminQuoteRequests,
  type AdminQuoteRequestsPage,
  type AdminQuoteRequestsQuery,
} from '../../services/quoteService'
import { QuoteTable } from '../../components/admin/QuoteTable'
import { AdminPagination } from '../../components/admin/AdminPagination'
import { AdminTableSkeleton } from '../../components/admin/AdminTableSkeleton'
import { FilterBar } from '../../components/filters/FilterBar'
import { FilterSort, type FilterSortOption } from '../../components/admin/FilterSort'
import type { FilterField, FilterValues } from '../../components/filters/filterTypes'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
import { formatQuoteStatus, getAllQuoteStatuses } from '../../utils/quoteStatus'

const pageSize = 10

const quoteFields: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    quick: true,
    group: 'Status',
    options: [
      { value: '', label: 'All statuses' },
      ...getAllQuoteStatuses().map((status) => ({ value: status, label: formatQuoteStatus(status) })),
    ],
  },
]

const quoteSortOptions: FilterSortOption[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
]

export function QuoteRequests() {
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState<AdminQuoteRequestsQuery>({ page: 1, pageSize, sort: 'newest' })
  const [result, setResult] = useState<AdminQuoteRequestsPage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useInitialRouteLoad(!isLoading)

  useEffect(() => {
    let current = true
    queueMicrotask(() => {
      if (!current) return
      setIsLoading(true)
      setError(null)
    })
    getAdminQuoteRequests(query)
      .then((page) => {
        if (current) setResult(page)
      })
      .catch((caught: unknown) => {
        if (current) setError(caught instanceof ApiError ? caught.message : 'Quote requests could not be loaded.')
      })
      .finally(() => {
        if (current) setIsLoading(false)
      })
    return () => {
      current = false
    }
  }, [query])

  const updateSearch = (value: string) => {
    setQuery((current) => ({ ...current, search: value.trim() || undefined, page: 1 }))
  }

  const updateFilter = (key: 'status' | 'sort', value: string) => {
    setQuery((current) => ({
      ...current,
      [key]: value || undefined,
      page: 1,
    }))
  }

  const total = result?.pagination.total ?? 0
  const currentPage = result?.pagination.page ?? 1
  const totalPages = result?.pagination.totalPages ?? 1

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Customer enquiries</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Quote requests</h1>
          <p className="mt-3 text-sm text-muted">Review, contact, and manage pricing requests from customers.</p>
        </div>
        <Link className="text-sm font-bold text-green hover:text-orange" to="/admin">Back to dashboard</Link>
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Quote request filters">
        <FilterBar
          fields={quoteFields}
          committed={{ status: query.status ?? '' }}
          onApply={(next: FilterValues) => setQuery((current) => ({
            ...current,
            status: (next.status || undefined) as AdminQuoteRequestsQuery['status'],
            page: 1,
          }))}
          search={{
            label: 'Search quote requests',
            value: searchInput,
            onChange: setSearchInput,
            onSearch: updateSearch,
            placeholder: 'Reference, customer, email, or phone',
          }}
          headerActions={
            <FilterSort
              ariaLabel="Sort quote requests"
              value={query.sort ?? 'newest'}
              options={quoteSortOptions}
              onChange={(value) => updateFilter('sort', value)}
            />
          }
        />
      </section>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      <section className="mt-6 rounded-2xl border border-line bg-white shadow-sm" aria-label="Quote requests">
        {isLoading ? (
          <AdminTableSkeleton desktopColumns={6} label="Loading quote requests" />
        ) : result?.quoteRequests.length ? (
          <>
            <div className="mb-4 flex items-center justify-between px-5 pt-5 text-sm text-muted">
              <span>{total} {total === 1 ? 'request' : 'requests'}</span>
              <span>Page {currentPage} of {totalPages}</span>
            </div>
            <QuoteTable quoteRequests={result?.quoteRequests ?? []} />
            {totalPages > 1 && (
              <AdminPagination
                className="border-t border-line px-5 py-4"
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
              />
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-16 text-center">
            <h2 className="text-xl font-bold text-green-dark">No quote requests found</h2>
            <p className="mt-2 text-sm text-muted">Try a different filter.</p>
          </div>
        )}
      </section>
    </div>
  )
}