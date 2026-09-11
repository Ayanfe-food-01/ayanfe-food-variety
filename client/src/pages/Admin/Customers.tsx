import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import { getAdminCustomers } from '../../services/customerService'
import type { AdminCustomersPage, AdminCustomersQuery, CustomerSort } from '../../types/customer'
import { CustomersFilterPanel } from '../../components/admin/CustomersFilterPanel'
import { CustomersTable } from '../../components/admin/CustomersTable'
import { formatPrice } from '../../components/admin/orderPresentation'
import { StatCard } from '../../components/admin/StatCard'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import { FilterSort, type FilterSortOption } from '../../components/admin/FilterSort'
import { AdminPagination } from '../../components/admin/AdminPagination'
import { AdminTableSkeleton } from '../../components/admin/AdminTableSkeleton'
import { formatPercentChange } from '../../components/admin/dashboard/dashboardFormat'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'

const pageSize = 10

const sortOptions: FilterSortOption[] = [
  { value: 'recent', label: 'Most recent order' },
  { value: 'spend', label: 'Highest spend' },
  { value: 'orders', label: 'Most orders' },
  { value: 'newest', label: 'Newest customers' },
]

export function Customers() {
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState<AdminCustomersQuery>({ page: 1, pageSize, sort: 'recent' })
  const [result, setResult] = useState<AdminCustomersPage | null>(null)
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
    getAdminCustomers(query)
      .then((page) => {
        if (current) setResult(page)
      })
      .catch((caught: unknown) => {
        if (current) setError(caught instanceof ApiError ? caught.message : 'Customers could not be loaded.')
      })
      .finally(() => {
        if (current) setIsLoading(false)
      })
    return () => {
      current = false
    }
  }, [query])

  const updateQuery = (next: Partial<AdminCustomersQuery>) => {
    setQuery((current) => ({ ...current, ...next }))
  }

  const total = result?.pagination.total ?? 0
  const currentPage = result?.pagination.page ?? 1
  const totalPages = result?.pagination.totalPages ?? 1

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Breadcrumb className="mb-5" items={[{ label: 'Dashboard', href: '/admin' }, { label: 'Customers' }]} />
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Operations</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Customers</h1>
          <p className="mt-3 text-sm text-muted">Review your customer base, order activity, and spending.</p>
        </div>
      </div>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4" aria-label="Customer metrics">
        <StatCard
          label="Total customers"
          value={result?.summary.totalCustomers ?? 0}
          detail="Accounts on the platform"
          accent="green"
          isLoading={isLoading}
        />
        <StatCard
          label="New this month"
          value={result?.summary.newThisMonth ?? 0}
          detail={summaryDetail(result)}
          accent="orange"
          isLoading={isLoading}
        />
        <StatCard
          label="Repeat customers"
          value={result?.summary.repeatCustomerPct !== null && result?.summary.repeatCustomerPct !== undefined ? `${result.summary.repeatCustomerPct}%` : '—'}
          detail="Customers with 2+ orders"
          accent="green"
          isLoading={isLoading}
        />
        <StatCard
          label="Avg lifetime spend"
          value={result && result.summary.averageLifetimeSpend ? formatPrice(result.summary.averageLifetimeSpend) : '—'}
          detail="Across paying customers"
          accent="orange"
          isLoading={isLoading}
        />
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Customer filters">
        <CustomersFilterPanel
          query={query}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onApply={(next) => updateQuery({ ...next, page: 1 })}
          headerActions={
            <FilterSort
              ariaLabel="Sort customers"
              value={query.sort ?? 'recent'}
              options={sortOptions}
              onChange={(value) => setQuery((current) => ({ ...current, sort: value as CustomerSort, page: 1 }))}
            />
          }
        />
      </section>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      <section className="mt-6 rounded-2xl border border-line bg-white shadow-sm" aria-label="Customers">
        {isLoading ? (
          <AdminTableSkeleton desktopColumns={6} label="Loading customers" />
        ) : result?.customers.length ? (
          <>
            <div className="mb-4 flex items-center justify-between px-5 pt-5 text-sm text-muted">
              <span>{total} {total === 1 ? 'customer' : 'customers'}</span>
              <span>Page {currentPage} of {totalPages}</span>
            </div>
            <CustomersTable customers={result.customers} />
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
            <h2 className="text-xl font-bold text-green-dark">No customers found</h2>
            <p className="mt-2 text-sm text-muted">Try a different filter or search.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function summaryDetail(result: AdminCustomersPage | null): string {
  if (!result) return 'vs previous month'
  const previous = result.summary.previousMonthCustomers
  if (previous <= 0) return 'This month'
  const change = formatPercentChange(result.summary.newThisMonth, previous)
  return change !== null ? `vs previous month (${change}%)` : 'This month'
}