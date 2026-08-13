import { useEffect, useState, type FormEvent } from 'react'
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
import { SelectField } from '../../components/ui/SelectField'
import { useToast } from '../../components/ui/Toast'

const pageSize = 10
const formatPrice = (value: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value))

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
  const [result, setResult] = useState<AdminPaymentsPage | null>(null)
  const [selected, setSelected] = useState<AdminPayment | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    let current = true
    setIsLoading(true)
    setError(null)
    getAdminPayments(query)
      .then((page) => {
        if (current) setResult(page)
      })
      .catch((caught: unknown) => {
        if (current) setError(caught instanceof ApiError ? caught.message : 'Payments could not be loaded.')
      })
      .finally(() => {
        if (current) setIsLoading(false)
      })
    return () => { current = false }
  }, [query])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setQuery((current) => ({ ...current, search: searchInput.trim() || undefined, page: 1 }))
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
        <form className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto_repeat(4,minmax(130px,auto))]" onSubmit={submitSearch}>
          <label className="text-xs font-bold text-green-dark">
            Search payments
            <input className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Order, customer, email, or reference" />
          </label>
          <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark lg:self-end" type="submit">Search</button>
          <label className="text-xs font-bold text-green-dark">Status
            <SelectField className="mt-2 w-full" options={[{ value: 'PENDING', label: 'Pending first' }, { value: '', label: 'All statuses' }, { value: 'VERIFIED', label: 'Confirmed' }, { value: 'REJECTED', label: 'Rejected' }]} onChange={(value) => updateFilter('status', value)} value={query.status ?? ''} />
          </label>
          <label className="text-xs font-bold text-green-dark">Method
            <SelectField className="mt-2 w-full" options={[{ value: '', label: 'All methods' }, { value: 'BANK_TRANSFER', label: 'Bank transfer' }]} onChange={(value) => updateFilter('paymentMethod', value)} value={query.paymentMethod ?? ''} />
          </label>
          <label className="text-xs font-bold text-green-dark">From
            <input className="mt-2 w-full rounded-xl border border-line bg-cream px-3 py-3 text-sm font-normal outline-none focus:border-green" type="date" value={query.from ?? ''} onChange={(event) => setQuery((current) => ({ ...current, from: event.target.value || undefined, page: 1 }))} />
          </label>
          <label className="text-xs font-bold text-green-dark">To
            <input className="mt-2 w-full rounded-xl border border-line bg-cream px-3 py-3 text-sm font-normal outline-none focus:border-green" type="date" value={query.to ?? ''} onChange={(event) => setQuery((current) => ({ ...current, to: event.target.value || undefined, page: 1 }))} />
          </label>
          <label className="text-xs font-bold text-green-dark">Sort
            <SelectField className="mt-2 w-full" options={[{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }]} onChange={(value) => updateFilter('sort', value)} value={query.sort ?? 'newest'} />
          </label>
        </form>
      </section>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      {isLoading ? (
        <div className="mt-8 rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading payment submissions…</div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between text-sm text-muted"><span>{result?.pagination.total ?? 0} submissions</span><span>Page {currentPage} of {totalPages}</span></div>
          <div className="mt-3"><PaymentTable payments={result?.payments ?? []} onSelect={(payment) => void openReview(payment)} /></div>
          {totalPages > 1 && <div className="mt-5 flex items-center justify-between gap-4"><button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark hover:border-green disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={currentPage <= 1} onClick={() => setQuery((current) => ({ ...current, page: currentPage - 1 }))}>Previous</button><span className="text-xs font-bold text-muted">{currentPage} / {totalPages}</span><button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark hover:border-green disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={currentPage >= totalPages} onClick={() => setQuery((current) => ({ ...current, page: currentPage + 1 }))}>Next</button></div>}
        </>
      )}

      {selected && !isDetailLoading && <PaymentReview payment={selected} isSaving={isSaving} onClose={() => setSelected(null)} onVerify={(note) => review('verify', note)} onReject={(reason, note) => review('reject', note ?? '', reason)} />}
    </div>
  )
}