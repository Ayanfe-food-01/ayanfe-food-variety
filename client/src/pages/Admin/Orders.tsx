import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../services/api'
import {
  getAdminOrders,
  type AdminOrdersPage,
  type AdminOrdersQuery,
} from '../../services/orderService'
import { OrderTable } from '../../components/admin/OrderTable'
import { SelectField } from '../../components/ui/SelectField'

const pageSize = 10

export function Orders() {
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState<AdminOrdersQuery>({ page: 1, pageSize, sort: 'newest' })
  const [result, setResult] = useState<AdminOrdersPage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    queueMicrotask(() => {
      if (!current) return
      setIsLoading(true)
      setError(null)
    })
    getAdminOrders(query)
      .then((page) => {
        if (current) setResult(page)
      })
      .catch((caught: unknown) => {
        if (current) setError(caught instanceof ApiError ? caught.message : 'Orders could not be loaded.')
      })
      .finally(() => {
        if (current) setIsLoading(false)
      })
    return () => {
      current = false
    }
  }, [query])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setQuery((current) => ({ ...current, search: searchInput.trim() || undefined, page: 1 }))
  }

  const updateFilter = (key: 'paymentStatus' | 'orderStatus' | 'sort', value: string) => {
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
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Operations</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Orders</h1>
          <p className="mt-3 text-sm text-muted">Search, review, and move orders through fulfillment.</p>
        </div>
        <Link className="text-sm font-bold text-green hover:text-orange" to="/admin">Back to dashboard</Link>
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Order filters">
        <form className="flex flex-col gap-3 lg:flex-row" onSubmit={submitSearch}>
          <label className="flex-1 text-xs font-bold text-green-dark">
            Search orders
            <input
              className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Order number, customer, email, or phone"
            />
          </label>
          <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark lg:self-end" type="submit">Search</button>
          <label className="text-xs font-bold text-green-dark">
            Payment
            <SelectField
              className="mt-2 w-full sm:w-40"
              options={[
                { value: '', label: 'All payments' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'PAID', label: 'Paid' },
                { value: 'FAILED', label: 'Failed' },
              ]}
              onChange={(value) => updateFilter('paymentStatus', value)}
              value={query.paymentStatus ?? ''}
            />
          </label>
          <label className="text-xs font-bold text-green-dark">
            Order status
            <SelectField
              className="mt-2 w-full sm:w-44"
              options={[
                { value: '', label: 'All statuses' },
                { value: 'ORDER_PLACED', label: 'Order Placed' },
                { value: 'PROCESSING', label: 'Processing' },
                { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
                { value: 'DELIVERED', label: 'Delivered' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
              onChange={(value) => updateFilter('orderStatus', value)}
              value={query.orderStatus ?? ''}
            />
          </label>
          <label className="text-xs font-bold text-green-dark">
            Sort
            <SelectField
              className="mt-2 w-full sm:w-36"
              options={[
                { value: 'newest', label: 'Newest first' },
                { value: 'oldest', label: 'Oldest first' },
              ]}
              onChange={(value) => updateFilter('sort', value)}
              value={query.sort ?? 'newest'}
            />
          </label>
        </form>
      </section>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      {isLoading ? (
        <div className="mt-8 rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading orders…</div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between text-sm text-muted"><span>{total} {total === 1 ? 'order' : 'orders'}</span><span>Page {currentPage} of {totalPages}</span></div>
          <div className="mt-3"><OrderTable orders={result?.orders ?? []} /></div>
          {totalPages > 1 && (
            <div className="mt-5 flex items-center justify-between gap-4">
              <button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark hover:border-green disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={currentPage <= 1} onClick={() => setQuery((current) => ({ ...current, page: currentPage - 1 }))}>Previous</button>
              <span className="text-xs font-bold text-muted">{currentPage} / {totalPages}</span>
              <button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark hover:border-green disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={currentPage >= totalPages} onClick={() => setQuery((current) => ({ ...current, page: currentPage + 1 }))}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}