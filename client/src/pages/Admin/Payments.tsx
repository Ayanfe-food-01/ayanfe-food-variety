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
import { AdminPagination } from '../../components/admin/AdminPagination'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { FilterBar } from '../../components/filters/FilterBar'
import { FilterSort } from '../../components/admin/FilterSort'
import {
  PaymentStats,
  PaymentCompactList,
  PaymentDetailModal,
  paymentFilterFields,
  paymentSortOptions,
  applyPaymentFilter,
} from '../../components/admin/payments'
import type { FilterValues } from '../../components/filters/filterTypes'
import { useToast } from '../../components/ui/Toast'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'

const pageSize = 10

export function Payments() {
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState<AdminPaymentsQuery>({ page: 1, pageSize, sort: 'newest' })
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
    methodBreakdown: {
      paystack: { count: 0, totalAmount: '0' },
      bankTransfer: { count: 0, totalAmount: '0' },
    },
  }
  const currentPage = result?.pagination.page ?? 1
  const totalPages = result?.pagination.totalPages ?? 1

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Payments' }]}
        eyebrow="Cash management"
        title="Payments"
        description="Review transfer receipts manually before confirming payment."
      />

      <PaymentStats pending={summary.pending} verified={summary.verified} rejected={summary.rejected} methodBreakdown={summary.methodBreakdown} />

      <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Payment filters">
        <FilterBar
          fields={paymentFilterFields}
          committed={{
            status: query.status ?? '',
            paymentMethod: query.paymentMethod ?? '',
            from: query.from ?? '',
            to: query.to ?? '',
          }}
          onApply={(next: FilterValues) => {
            setQuery((current) => ({ ...current, ...applyPaymentFilter(next), page: 1 }))
          }}
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
              onChange={(value) => setQuery((current) => ({ ...current, sort: value as AdminPaymentsQuery['sort'], page: 1 }))}
            />
          }
        />
      </section>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      {isLoading ? (
        <div className="mt-8 rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading payments…</div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between text-sm text-muted"><span>{result?.pagination.total ?? 0} payment{result?.pagination.total === 1 ? '' : 's'}</span><span>Page {currentPage} of {totalPages}</span></div>
          <div className="mt-3"><PaymentCompactList payments={result?.payments ?? []} onSelect={(payment) => void openReview(payment)} /></div>
          {totalPages > 1 && <AdminPagination className="mt-5" currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setQuery((current) => ({ ...current, page }))} />}
        </>
      )}

      {selected && (
        <PaymentDetailModal
          payment={selected}
          isLoading={isDetailLoading}
          isSaving={isSaving}
          onClose={() => setSelected(null)}
          onVerify={(note) => review('verify', note)}
          onReject={(reason, note) => review('reject', note ?? '', reason)}
        />
      )}
    </div>
  )
}