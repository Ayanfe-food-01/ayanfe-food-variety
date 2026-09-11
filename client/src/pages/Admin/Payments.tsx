import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import {
  getAdminPayment,
  getAdminPayments,
  rejectAdminPayment,
  verifyAdminPayment,
  type AdminPayment,
  type AdminPaymentsPage,
  type AdminPaymentsQuery,
  type PaymentRejectionReason,
} from '../../services/paymentService'
import { PaymentReview } from '../../components/admin/PaymentReview'
import { PaymentTable } from '../../components/admin/PaymentTable'
import { AdminPagination } from '../../components/admin/AdminPagination'
import { FilterBar } from '../../components/filters/FilterBar'
import { FilterSort, type FilterSortOption } from '../../components/admin/FilterSort'
import type { FilterField, FilterValues } from '../../components/filters/filterTypes'
import { useToast } from '../../components/ui/Toast'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'

const pageSize = 10
const formatPrice = (value: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value))

const paymentFields: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    quick: true,
    group: 'Status',
    options: [
      { value: '', label: 'All statuses' },
      { value: 'PENDING', label: 'Pending' },
      { value: 'VERIFIED', label: 'Confirmed' },
      { value: 'REJECTED', label: 'Rejected' },
    ],
  },
  {
    key: 'paymentMethod',
    label: 'Method',
    type: 'select',
    quick: true,
    group: 'Status',
    options: [
      { value: '', label: 'All methods' },
      { value: 'BANK_TRANSFER', label: 'Bank transfer' },
    ],
  },
]

const paymentSortOptions: FilterSortOption[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
]

function SummaryCard({ label, count, total, emphasis }: { label: string; count: number; total: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${emphasis ? 'border-orange/30 bg-orange/5' : 'border-line bg-white'}`}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-green-dark">{count}</p>
      <p className="mt-1 text-xs text-muted">{formatPrice(total)} submitted</p>
    </div>
  )
}

export function Payments() {
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState<AdminPaymentsQuery>({ status: 'PENDING', page: 1, pageSize, sort: 'newest' })
  const [selected, setSelected] = useState<AdminPayment | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadedPage, setLoadedPage] = useState<{
    query: AdminPaymentsQuery
    result: AdminPaymentsPage | null
    error: string | null
  } | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    let current = true
    const requestQuery = query
    getAdminPayments(requestQuery)
      .then((page) => {
        if (current) setLoadedPage({ query: requestQuery, result: page, error: null })
      })
      .catch((caught: unknown) => {
        if (current) {
          setLoadedPage((prev) => ({
            query: requestQuery,
            result: prev?.result ?? null,
            error: caught instanceof ApiError ? caught.message : 'Payments could not be loaded.',
          }))
        }
      })
    return () => { current = false }
  }, [query])

  const isLoading = loadedPage === null || loadedPage.query !== query
  const error = loadedPage !== null && loadedPage.query === query ? loadedPage.error : null
  const result = loadedPage !== null && loadedPage.query === query ? loadedPage.result : null

  useInitialRouteLoad(!isLoading)

  const updateSearch = (value: string) => {
    setQuery((current) => ({ ...current, search: value.trim() || undefined, page: 1 }))
  }

  const updateFilter = (key: 'status' | 'paymentMethod' | 'sort', value: string) => {
    setQuery((current) => ({ ...current, [key]: value || undefined, page: 1 }))
  }

  const openReview = async (payment: AdminPayment) => {
    setSelected(payment)
    setIsDetailLoading(true)
    try {
      setSelected(await getAdminPayment(payment.id))
    } catch (caught) {
      showToast(caught instanceof ApiError ? caught.message : 'Payment details could not be loaded.', 'error')
      setSelected(null)
    } finally {
      setIsDetailLoading(false)
    }
  }

  const review = async (action: 'verify' | 'reject', note: string, reason?: PaymentRejectionReason) => {
    if (!selected) return
    setIsSaving(true)
    try {
      if (action === 'verify') await verifyAdminPayment(selected.id, note)
      else if (reason) await rejectAdminPayment(selected.id, reason, note)
      setSelected(null)
      setQuery((current) => ({ ...current, page: 1 }))
      showToast(`Payment ${action === 'verify' ? 'confirmed' : 'rejected'} successfully.`, 'success')
    } catch (caught) {
      showToast(caught instanceof ApiError ? caught.message : 'Payment review could not be saved.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const summary = result?.summary ?? {
    pending: { count: 0, totalAmount: '0' },
    verified: { count: 0, totalAmount: '0' },
    rejected: { count: 0, totalAmount: '0' },
  }
  const currentPage = result?.pagination.page ?? 1
  const totalPages = result?.pagination.totalPages ?? 1

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Cash management</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Payments</h1>
          <p className="mt-3 text-sm text-muted">Review transfer receipts manually before confirming payment.</p>
        </div>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-3" aria-label="Payment verification overview">
        <SummaryCard label="Pending verification" count={summary.pending.count} total={summary.pending.totalAmount} emphasis />
        <SummaryCard label="Confirmed" count={summary.verified.count} total={summary.verified.totalAmount} />
        <SummaryCard label="Rejected" count={summary.rejected.count} total={summary.rejected.totalAmount} />
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Payment filters">
        <div className="space-y-4">
          <FilterBar
            fields={paymentFields}
            committed={{
              status: query.status ?? '',
              paymentMethod: query.paymentMethod ?? '',
            }}
            onApply={(next: FilterValues) => setQuery((current) => ({
              ...current,
              status: (next.status || undefined) as AdminPaymentsQuery['status'],
              paymentMethod: next.paymentMethod as AdminPaymentsQuery['paymentMethod'],
              page: 1,
            }))}
            search={{
              label: 'Search payments',
              value: searchInput,
              onChange: setSearchInput,
              onSearch: updateSearch,
              placeholder: 'Order, customer, email, or reference',
            }}
            headerActions={
              <FilterSort
                ariaLabel="Sort payments"
                value={query.sort ?? 'newest'}
                options={paymentSortOptions}
                onChange={(value) => updateFilter('sort', value)}
              />
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:items-end">
            <label className="min-w-0 text-xs font-bold text-green-dark">From
              <input className="mt-2 w-full min-w-0 rounded-xl border border-line bg-cream px-3 py-3 text-sm font-normal outline-none focus:border-green" type="date" value={query.from ?? ''} onChange={(event) => setQuery((current) => ({ ...current, from: event.target.value || undefined, page: 1 }))} />
            </label>
            <label className="min-w-0 text-xs font-bold text-green-dark">To
              <input className="mt-2 w-full min-w-0 rounded-xl border border-line bg-cream px-3 py-3 text-sm font-normal outline-none focus:border-green" type="date" value={query.to ?? ''} onChange={(event) => setQuery((current) => ({ ...current, to: event.target.value || undefined, page: 1 }))} />
            </label>
          </div>
        </div>
      </section>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      {isLoading ? (
        <div className="mt-8 rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading payment submissions…</div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between text-sm text-muted"><span>{result?.pagination.total ?? 0} submissions</span><span>Page {currentPage} of {totalPages}</span></div>
          <div className="mt-3"><PaymentTable payments={result?.payments ?? []} onSelect={(payment) => void openReview(payment)} /></div>
          {totalPages > 1 && <AdminPagination className="mt-5" currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setQuery((current) => ({ ...current, page }))} />}
        </>
      )}

      {selected && !isDetailLoading && <PaymentReview payment={selected} isSaving={isSaving} onClose={() => setSelected(null)} onVerify={(note) => review('verify', note)} onReject={(reason, note) => review('reject', note ?? '', reason)} />}
    </div>
  )
}