import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../services/api'
import {
  archiveAdminOrder,
  deleteAdminOrder,
  getAdminOrders,
  restoreAdminOrder,
  type AdminOrderListItem,
  type AdminOrdersPage,
  type AdminOrdersQuery,
} from '../../services/orderService'
import { OrderTable } from '../../components/admin/OrderTable'
import { FilterBar } from '../../components/filters/FilterBar'
import { FilterSort, type FilterSortOption } from '../../components/admin/FilterSort'
import { AdminPagination } from '../../components/admin/AdminPagination'
import type { FilterField, FilterValues } from '../../components/filters/filterTypes'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'

const pageSize = 10

const orderFields: FilterField[] = [
  {
    key: 'paymentStatus',
    label: 'Payment',
    type: 'select',
    quick: true,
    group: 'Status',
    options: [
      { value: '', label: 'All payments' },
      { value: 'PENDING', label: 'Pending' },
      { value: 'PAID', label: 'Paid' },
      { value: 'FAILED', label: 'Failed' },
    ],
  },
  {
    key: 'orderStatus',
    label: 'Order status',
    type: 'select',
    quick: true,
    group: 'Status',
    options: [
      { value: '', label: 'All statuses' },
      { value: 'ORDER_PLACED', label: 'Order Placed' },
      { value: 'PROCESSING', label: 'Processing' },
      { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
      { value: 'DELIVERED', label: 'Delivered' },
      { value: 'CANCELLED', label: 'Cancelled' },
    ],
  },
]

const orderSortOptions: FilterSortOption[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
]

export function Orders() {
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState<AdminOrdersQuery>({ archive: 'active', page: 1, pageSize, sort: 'newest' })
  const [result, setResult] = useState<AdminOrdersPage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useInitialRouteLoad(!isLoading)
  const [busyOrderNumber, setBusyOrderNumber] = useState<string | null>(null)
  const [deleteOrder, setDeleteOrder] = useState<AdminOrderListItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { showToast } = useToast()

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
  }, [query, refreshToken])

  const updateSearch = (value: string) => {
    setQuery((current) => ({ ...current, search: value.trim() || undefined, page: 1 }))
  }

  const updateFilter = (key: 'paymentStatus' | 'orderStatus' | 'sort', value: string) => {
    setQuery((current) => ({
      ...current,
      [key]: value || undefined,
      page: 1,
    }))
  }

  const updateArchiveView = (archive: 'active' | 'archived') => {
    setQuery((current) => ({ ...current, archive, page: 1 }))
  }

  const changeArchiveState = async (orderNumber: string, action: 'archive' | 'restore') => {
    setBusyOrderNumber(orderNumber)
    try {
      if (action === 'archive') {
        await archiveAdminOrder(orderNumber)
        showToast('Order archived. It remains available in Archived orders.', 'success')
      } else {
        await restoreAdminOrder(orderNumber)
        showToast('Order restored to the active order list.', 'success')
      }
      setRefreshToken((current) => current + 1)
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'The order could not be updated.', 'error')
    } finally {
      setBusyOrderNumber(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteOrder) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteAdminOrder(deleteOrder.orderNumber)
      setDeleteOrder(null)
      showToast('Order permanently deleted.', 'success')
      setRefreshToken((current) => current + 1)
    } catch (caught: unknown) {
      setDeleteError(caught instanceof ApiError ? caught.message : 'The order could not be deleted.')
    } finally {
      setIsDeleting(false)
    }
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

      <div className="mt-8 flex flex-wrap gap-2" aria-label="Order archive view">
        {([
          ['active', 'Active orders'],
          ['archived', 'Archived orders'],
        ] as const).map(([value, label]) => (
          <button
            className={`rounded-xl px-4 py-2.5 text-sm font-bold ${query.archive === value ? 'bg-green text-cream' : 'border border-line bg-white text-green-dark hover:border-green'}`}
            type="button"
            key={value}
            aria-pressed={query.archive === value}
            onClick={() => updateArchiveView(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Order filters">
        <FilterBar
          fields={orderFields}
          committed={{
            paymentStatus: query.paymentStatus ?? '',
            orderStatus: query.orderStatus ?? '',
          }}
          onApply={(next: FilterValues) => setQuery((current) => ({
            ...current,
            paymentStatus: (next.paymentStatus || undefined) as AdminOrdersQuery['paymentStatus'],
            orderStatus: (next.orderStatus || undefined) as AdminOrdersQuery['orderStatus'],
            page: 1,
          }))}
          search={{
            label: 'Search orders',
            value: searchInput,
            onChange: setSearchInput,
            onSearch: updateSearch,
            placeholder: 'Order number, customer, email, or phone',
          }}
          headerActions={
            <FilterSort
              ariaLabel="Sort orders"
              value={query.sort ?? 'newest'}
              options={orderSortOptions}
              onChange={(value) => updateFilter('sort', value)}
            />
          }
        />
      </section>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      {isLoading ? (
        <div className="mt-8 rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading orders…</div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between text-sm text-muted"><span>{total} {total === 1 ? 'order' : 'orders'}</span><span>Page {currentPage} of {totalPages}</span></div>
          <div className="mt-3">
            <OrderTable
              orders={result?.orders ?? []}
              archiveView={query.archive === 'archived' ? 'archived' : 'active'}
              busyOrderNumber={busyOrderNumber}
              onArchive={(orderNumber) => void changeArchiveState(orderNumber, 'archive')}
              onRestore={(orderNumber) => void changeArchiveState(orderNumber, 'restore')}
              onDelete={(order) => {
                setDeleteError(null)
                setDeleteOrder(order)
              }}
            />
          </div>
          {totalPages > 1 && (
            <AdminPagination
              className="mt-5"
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
            />
          )}
        </>
      )}
      {deleteOrder && (
        <ConfirmDialog
          eyebrow="Permanent deletion"
          title={`Delete ${deleteOrder.orderNumber} permanently?`}
          description="This permanently removes the archived order and its order-specific records. This cannot be undone. Orders with payment records or unreconciled stock are protected from deletion."
          error={deleteError}
          isBusy={isDeleting}
          confirmLabel="Delete permanently"
           busyLabel="Deleting…"
          onCancel={() => {
            if (!isDeleting) {
              setDeleteOrder(null)
              setDeleteError(null)
            }
          }}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  )
}