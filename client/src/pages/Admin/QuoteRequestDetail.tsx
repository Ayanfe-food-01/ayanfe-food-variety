import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../services/api'
import {
  getAdminQuoteRequest,
  updateAdminQuoteRequestNote,
  updateAdminQuoteRequestStatus,
  type AdminQuoteRequestDetail,
  type QuoteRequestStatus,
} from '../../services/quoteService'
import { formatQuoteStatus, getQuoteStatusOptions } from '../../utils/quoteStatus'
import { formatDate } from '../../utils/dateFormat'
import { useToast } from '../../components/ui/Toast'
import { SelectField } from '../../components/ui/SelectField'

const statusClass = (status: QuoteRequestStatus) => {
  if (status === 'COMPLETED') return 'bg-green/10 text-green'
  if (status === 'CONTACTED' || status === 'QUOTED' || status === 'CANCELLED') return 'bg-orange/10 text-orange'
  return 'bg-sage text-green-dark'
}

const isTerminal = (status: QuoteRequestStatus) => status === 'COMPLETED' || status === 'CANCELLED'

export function QuoteRequestDetail() {
  const { reference } = useParams()
  const [quote, setQuote] = useState<AdminQuoteRequestDetail | null>(null)
  const [status, setStatus] = useState<QuoteRequestStatus>('PENDING')
  const [internalNote, setInternalNote] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingStatus, setIsSavingStatus] = useState(false)
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    if (!reference) return
    getAdminQuoteRequest(reference)
      .then((loaded) => {
        setQuote(loaded)
        setStatus(loaded.status)
        setInternalNote(loaded.adminNote ?? '')
      })
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Quote request details could not be loaded.'))
      .finally(() => setIsLoading(false))
  }, [reference])

  const persistStatus = async () => {
    if (!quote || !reference || status === quote.status) return
    setIsSavingStatus(true)
    setError(null)
    try {
      setQuote(await updateAdminQuoteRequestStatus(reference, status))
      showToast('Quote request status updated.', 'success')
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'Quote request status could not be updated.', 'error')
    } finally {
      setIsSavingStatus(false)
    }
  }

  const persistNote = async () => {
    if (!quote || !reference || internalNote === (quote.adminNote ?? '')) return
    setIsSavingNote(true)
    setError(null)
    try {
      setQuote(await updateAdminQuoteRequestNote(reference, internalNote))
      showToast('Internal note saved.', 'success')
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'The internal note could not be saved.', 'error')
    } finally {
      setIsSavingNote(false)
    }
  }

  if (isLoading) return <div className="rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading quote request…</div>
  if (!quote) return <div><div className="rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">{error ?? 'Quote request not found.'}</div><Link className="mt-5 inline-block font-bold text-green" to="/admin/quote-requests">Back to quote requests</Link></div>

  const statusOptions = getQuoteStatusOptions(status)

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link className="text-sm font-bold text-green hover:text-orange" to="/admin/quote-requests">← Back to quote requests</Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-orange">Quote request detail</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">{quote.quoteNumber}</h1>
          <p className="mt-3 text-sm text-muted">Received {formatDate(quote.createdAt, true)}</p>
          <p className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]">
            <span className={quote.shoppingMode === 'WHOLESALE' ? 'inline-block size-2 rounded-full bg-orange' : 'inline-block size-2 rounded-full bg-green'} />
            <span className={quote.shoppingMode === 'WHOLESALE' ? 'text-orange' : 'text-green-dark'}>{quote.shoppingMode === 'WHOLESALE' ? 'Wholesale Request' : 'Retail Request'}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className={`rounded-full px-3 py-2 text-xs font-bold ${statusClass(quote.status)}`}>{formatQuoteStatus(quote.status)}</span>
          {isTerminal(quote.status) && <span className="rounded-full bg-sage px-3 py-2 text-xs font-bold text-green-dark">Closed</span>}
        </div>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}

      <section className="mt-8 grid gap-5 lg:grid-cols-2" aria-label="Customer and request details">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-green-dark">Customer</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Name</dt>
              <dd className="mt-1 font-semibold text-green-dark">{quote.customerName}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Email</dt>
              <dd className="mt-1 break-words text-muted"><a className="text-green hover:text-orange" href={`mailto:${quote.customerEmail}`}>{quote.customerEmail}</a></dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Phone</dt>
              <dd className="mt-1 break-words text-muted"><a className="text-green hover:text-orange" href={`tel:${quote.customerPhone}`}>{quote.customerPhone}</a></dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-green-dark">Request message</h2>
          {quote.message ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted">{quote.message}</p>
          ) : (
            <p className="mt-4 text-sm text-muted">No additional message was included with this request.</p>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-label="Requested items">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-green-dark">Requested items</h2>
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{quote.items.length} {quote.items.length === 1 ? 'item' : 'items'}</span>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line bg-sage/35 text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-3 font-bold">Product</th>
                <th className="px-4 py-3 font-bold">Option / size</th>
                <th className="px-4 py-3 font-bold text-right">Quantity</th>
                <th className="px-4 py-3 font-bold">Item note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {quote.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <Link className="break-words font-semibold text-green-dark hover:text-orange" to={`/admin/products/${item.productId}`}>{item.productName}</Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{item.productOptionLabel ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-green-dark">{item.quantity}</td>
                  <td className="max-w-[260px] break-words px-4 py-3 text-muted">{item.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" aria-label="Status and notes">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-bold text-green-dark">Quote status</h2>
            <p className="mt-1 text-sm text-muted">Move the request through your normal flow as you respond to the customer.</p>
          </div>
          {!isTerminal(status) && (
            <div className="flex items-end gap-2">
              <label className="text-xs font-bold text-green-dark">
                Status
                <SelectField
                  className="mt-2 w-44"
                  options={statusOptions.map((option) => ({
                    value: option,
                    label: option === status ? formatQuoteStatus(option) : `Move to ${formatQuoteStatus(option).toLowerCase()}`,
                  }))}
                  value={status}
                  onChange={(value) => setStatus(value as QuoteRequestStatus)}
                />
              </label>
              <button
                className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream disabled:cursor-not-allowed disabled:opacity-50 hover:bg-green-dark"
                type="button"
                disabled={isSavingStatus || status === quote.status}
                onClick={() => void persistStatus()}
              >
                {isSavingStatus ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-line pt-6">
          <label className="block text-sm font-bold text-green-dark" htmlFor="admin-quote-note">
            Internal note <span className="font-normal normal-case tracking-normal text-muted">(never shown to customers)</span>
          </label>
          <textarea
            className="mt-2 w-full resize-y rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
            id="admin-quote-note"
            rows={4}
            maxLength={2000}
            placeholder="Internal context for this request — pricing notes, agreed amounts, etc. This note is private to the admin portal."
            value={internalNote}
            onChange={(event) => setInternalNote(event.target.value)}
          />
          <div className="mt-3 flex justify-end">
            <button
              className="rounded-xl border border-green/25 px-5 py-2.5 text-sm font-bold text-green disabled:cursor-not-allowed disabled:opacity-50 hover:bg-green hover:text-cream"
              type="button"
              disabled={isSavingNote || internalNote === (quote.adminNote ?? '')}
              onClick={() => void persistNote()}
            >
              {isSavingNote ? 'Saving…' : 'Save note'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}