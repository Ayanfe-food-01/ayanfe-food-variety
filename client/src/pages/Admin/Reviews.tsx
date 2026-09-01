import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ActionMenu, ActionMenuButton, ActionMenuLink } from '../../components/admin/ActionMenu'
import { OrderInput } from '../../components/admin/OrderInput'
import { StoryPreviewModal } from '../../components/admin/StoryPreviewModal'
import { useToast } from '../../components/ui/Toast'
import { SelectField } from '../../components/ui/SelectField'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
import { ApiError } from '../../services/api'
import {
  deleteAdminReview,
  getAdminReviews,
  updateAdminReviewFeatured,
  updateAdminReviewOrder,
  updateAdminReviewStatus,
  type AdminReviewItem,
  type AdminReviewsPage,
  type AdminReviewsQuery,
} from '../../services/adminService'
import type { CustomerStory } from '../../services/storeSettingsService'
import { formatDate as formatCompatibleDate } from '../../utils/dateFormat'
import { ResponsiveDataTable } from '../../components/ui/ResponsiveDataTable'
import { ReviewStars } from '../../components/reviews/ReviewStars'
import { VerifiedPurchaseBadge } from '../../components/reviews/VerifiedPurchaseBadge'

const pageSize = 10
const formatDate = (value: string) => value ? formatCompatibleDate(value) : '—'

const toPreviewStory = (review: AdminReviewItem): CustomerStory => ({
  id: `review:${review.id}`,
  type: 'review',
  authorName: review.customerName ?? 'Verified Customer',
  content: review.content,
  rating: review.rating,
  verifiedPurchase: review.verifiedPurchase,
  createdAt: review.createdAt,
})

type ReviewStatusTone = Record<AdminReviewItem['status'], { label: string; className: string }>

const statusTone: ReviewStatusTone = {
  PENDING: { label: 'Pending', className: 'bg-orange/10 text-orange' },
  APPROVED: { label: 'Approved', className: 'bg-sage text-green' },
  REJECTED: { label: 'Rejected', className: 'bg-line text-muted' },
}

interface ReviewActionsProps {
  review: AdminReviewItem
  isBusy: boolean
  onPreview: () => void
  onApprove: () => void
  onReject: () => void
  onToggleFeatured: () => void
  onDelete: () => void
}

function ReviewActions({ review, isBusy, onPreview, onApprove, onReject, onToggleFeatured, onDelete }: ReviewActionsProps) {
  return (
    <ActionMenu ariaLabel={`Actions for review by ${review.customerName ?? 'a customer'}`} isBusy={isBusy} fixedPosition>
      {(close) => (
        <>
          <ActionMenuLink to={`/admin/reviews/${review.id}`} onClick={close}>View details</ActionMenuLink>
          <ActionMenuButton onClick={() => { close(); onPreview() }}>Preview homepage card</ActionMenuButton>
          {review.status === 'PENDING' && <ActionMenuButton tone="accent" onClick={() => { close(); onApprove() }}>Approve review</ActionMenuButton>}
          {review.status === 'APPROVED' && <ActionMenuButton tone="danger" onClick={() => { close(); onReject() }}>Reject review</ActionMenuButton>}
          {review.status === 'REJECTED' && <ActionMenuButton tone="accent" onClick={() => { close(); onApprove() }}>Re-approve review</ActionMenuButton>}
          {review.status === 'APPROVED' && <ActionMenuButton onClick={() => { close(); onToggleFeatured() }}>{review.isFeatured ? 'Remove from featured' : 'Mark as featured'}</ActionMenuButton>}
          {review.status !== 'PENDING' && <ActionMenuButton tone="danger" onClick={() => { close(); onDelete() }}>Delete review</ActionMenuButton>}
        </>
      )}
    </ActionMenu>
  )
}

export function Reviews() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { showToast } = useToast()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [result, setResult] = useState<AdminReviewsPage | null>(null)
  const [query, setQuery] = useState<AdminReviewsQuery>({
    page: Number(searchParams.get('page') ?? 1),
    pageSize,
    search: searchParams.get('search') ?? undefined,
    status: (searchParams.get('status') as AdminReviewsQuery['status']) || undefined,
    verified: (searchParams.get('verified') as AdminReviewsQuery['verified']) || undefined,
    rating: searchParams.get('rating') ?? undefined,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [previewStory, setPreviewStory] = useState<CustomerStory | null>(null)
  const [reviewToModerate, setReviewToModerate] = useState<{ review: AdminReviewItem; action: 'approve' | 'reject' } | null>(null)
  const [reviewToDelete, setReviewToDelete] = useState<AdminReviewItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useInitialRouteLoad(!isLoading)

  useEffect(() => {
    let current = true
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true)
      setError(null)
      getAdminReviews(query)
        .then((loaded) => {
          if (current) setResult(loaded)
        })
        .catch((caught: unknown) => {
          if (current) setError(caught instanceof ApiError ? caught.message : 'Reviews could not be loaded.')
        })
        .finally(() => {
          if (current) setIsLoading(false)
        })
    }, 0)
    const nextParams = new URLSearchParams()
    if (query.page > 1) nextParams.set('page', String(query.page))
    if (query.search) nextParams.set('search', query.search)
    if (query.status) nextParams.set('status', query.status)
    if (query.verified) nextParams.set('verified', query.verified)
    if (query.rating) nextParams.set('rating', query.rating)
    setSearchParams(nextParams, { replace: true })
    return () => {
      current = false
      window.clearTimeout(timeoutId)
    }
  }, [query, setSearchParams])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setQuery((current) => ({ ...current, search: searchInput.trim() || undefined, page: 1 }))
  }

  const requestModeration = (review: AdminReviewItem, action: 'approve' | 'reject') => {
    setReviewToModerate({ review, action })
  }

  const confirmModeration = async () => {
    if (!reviewToModerate) return
    const { review, action } = reviewToModerate
    setBusyId(review.id)
    setError(null)
    try {
      const updated = await updateAdminReviewStatus(review.id, action === 'approve' ? 'APPROVED' : 'REJECTED')
      setReviewToModerate(null)
      showToast(`Review ${updated.status === 'APPROVED' ? 'approved' : 'rejected'} successfully.`, 'success')
      setQuery((current) => ({ ...current }))
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'Review status could not be updated.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const toggleFeatured = async (review: AdminReviewItem) => {
    setBusyId(review.id)
    setError(null)
    try {
      const updated = await updateAdminReviewFeatured(review.id, !review.isFeatured)
      showToast(`Review ${updated.isFeatured ? 'marked as' : 'removed from'} featured.`, 'success')
      setQuery((current) => ({ ...current }))
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'Featured status could not be updated.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const saveOrder = async (review: AdminReviewItem, displayOrder: number) => {
    setBusyId(review.id)
    setError(null)
    try {
      const updated = await updateAdminReviewOrder(review.id, displayOrder)
      showToast(`Display order set to ${updated.displayOrder}.`, 'success')
      setQuery((current) => ({ ...current }))
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'Display order could not be updated.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const openDeleteConfirmation = (review: AdminReviewItem) => {
    setDeleteError(null)
    setReviewToDelete(review)
  }

  const confirmDelete = async () => {
    if (!reviewToDelete) return
    const review = reviewToDelete
    setDeletingId(review.id)
    setDeleteError(null)
    try {
      await deleteAdminReview(review.id)
      showToast('Review deleted successfully.', 'success')
      setReviewToDelete(null)
      setQuery((current) => ({ ...current, page: Math.min(current.page, result?.pagination.totalPages ?? 1) }))
    } catch (caught: unknown) {
      setDeleteError(caught instanceof ApiError ? caught.message : 'Review could not be deleted.')
    } finally {
      setDeletingId(null)
    }
  }

  const reviews = result?.reviews ?? []
  const currentPage = result?.pagination.page ?? query.page
  const totalPages = result?.pagination.totalPages ?? 1

  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Moderation</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Reviews</h1>
          <p className="mt-3 text-sm text-muted">Approve, reject, and feature the customer reviews shown to your storefront.</p>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Review filters">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={submitSearch}>
          <label className="flex-1 text-xs font-bold text-green-dark">
            Search reviews
            <input className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Customer, product, or review" />
          </label>
          <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="submit">Search</button>
          <label className="text-xs font-bold text-green-dark">
            Status
            <SelectField
              className="mt-2 w-full sm:w-36"
              options={[
                { value: '', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              onChange={(value) => setQuery((current) => ({ ...current, status: (value || undefined) as AdminReviewsQuery['status'], page: 1 }))}
              value={query.status ?? ''}
            />
          </label>
          <label className="text-xs font-bold text-green-dark">
            Purchase
            <SelectField
              className="mt-2 w-full sm:w-36"
              options={[
                { value: '', label: 'All' },
                { value: 'verified', label: 'Verified' },
                { value: 'not-verified', label: 'Not verified' },
              ]}
              onChange={(value) => setQuery((current) => ({ ...current, verified: (value || undefined) as AdminReviewsQuery['verified'], page: 1 }))}
              value={query.verified ?? ''}
            />
          </label>
          <label className="text-xs font-bold text-green-dark">
            Rating
            <SelectField
              className="mt-2 w-full sm:w-32"
              options={[
                { value: '', label: 'All' },
                { value: '5', label: '5 stars' },
                { value: '4', label: '4 stars' },
                { value: '3', label: '3 stars' },
                { value: '2', label: '2 stars' },
                { value: '1', label: '1 star' },
              ]}
              onChange={(value) => setQuery((current) => ({ ...current, rating: value || undefined, page: 1 }))}
              value={query.rating ?? ''}
            />
          </label>
        </form>
      </section>

      {result?.featured && (
        <div className={`mt-6 flex flex-col gap-2 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 ${result.featured.remaining > 0 ? 'border-line bg-white' : 'border-orange/25 bg-orange/5'}`}>
          <span className="font-bold text-green-dark">Homepage featured slots:</span>
          <span className={result.featured.remaining > 0 ? 'text-muted' : 'font-bold text-orange'}>
            {result.featured.used} of {result.featured.max} used
            {result.featured.remaining > 0 ? ` · ${result.featured.remaining} available` : ' · limit reached'}
          </span>
          <span className="text-xs text-muted">Only approved reviews can be featured on the homepage.</span>
        </div>
      )}

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      {isLoading ? (
        <div className="mt-8 rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-16 text-center">
          <h2 className="text-xl font-bold text-green-dark">No reviews found</h2>
          <p className="mt-2 text-sm text-muted">Reviews submitted by customers will appear here for moderation.</p>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-line bg-white shadow-sm">
          <div className="mb-4 flex items-center justify-between px-5 pt-5 text-sm text-muted">
            <span>{result?.pagination.total ?? 0} {result?.pagination.total === 1 ? 'review' : 'reviews'}</span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          <div className="space-y-3 px-4 pb-4 lg:hidden">
            {reviews.map((review) => (
              <article className="rounded-2xl border border-line bg-cream/45 p-4" key={review.id}>
                <div className="flex items-start gap-3">
                  <div className="size-12 shrink-0 overflow-hidden rounded-full bg-sage">
                    {review.productImage && <img className="size-full object-cover" src={review.productImage} alt="" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="pr-2 font-bold text-green-dark">{review.customerName ?? 'Verified Customer'}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      <ReviewStars value={review.rating} size={13} />
                      <span className="font-semibold text-orange">{review.rating}/5</span>
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-green-dark">{review.productName}{review.productOptionLabel ? ` · ${review.productOptionLabel}` : ''}</p>
                    <p className="mt-1 line-clamp-2 break-words text-xs text-muted">{review.content}</p>
                  </div>
                  <ReviewActions
                    review={review}
                    isBusy={busyId === review.id || deletingId === review.id}
                    onPreview={() => setPreviewStory(toPreviewStory(review))}
                    onApprove={() => requestModeration(review, 'approve')}
                    onReject={() => requestModeration(review, 'reject')}
                    onToggleFeatured={() => void toggleFeatured(review)}
                    onDelete={() => openDeleteConfirmation(review)}
                  />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 text-xs">
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">Status</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${statusTone[review.status].className}`}>{statusTone[review.status].label}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">Purchase</dt>
                    <dd className="mt-1">{review.verifiedPurchase ? <VerifiedPurchaseBadge /> : <span className="text-muted">Not verified</span>}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">Featured</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${review.isFeatured ? 'bg-orange/10 text-orange' : 'bg-line text-muted'}`}>
                        {review.isFeatured ? 'Featured' : 'Not featured'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">Homepage order</dt>
                    <dd className="mt-1"><OrderInput value={review.displayOrder} isBusy={busyId === review.id} onSave={(displayOrder) => void saveOrder(review, displayOrder)} /></dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">Submitted</dt>
                    <dd className="mt-1 text-muted">{formatDate(review.createdAt)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className="hidden lg:block">
            <ResponsiveDataTable label="Reviews table horizontal scroll">
              <table className="w-full min-w-[1180px] whitespace-nowrap text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
                  <tr><th className="px-5 py-4 font-bold">Customer</th><th className="px-5 py-4 font-bold">Product</th><th className="px-5 py-4 font-bold">Rating</th><th className="px-5 py-4 font-bold">Review</th><th className="px-5 py-4 font-bold">Purchase</th><th className="px-5 py-4 font-bold">Status</th><th className="px-5 py-4 font-bold">Featured</th><th className="px-5 py-4 font-bold">Order</th><th className="px-5 py-4 font-bold">Submitted</th><th className="px-5 py-4 font-bold">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {reviews.map((review) => (
                    <tr key={review.id} className="group">
                      <td className="w-[240px] max-w-[240px] overflow-hidden px-5 py-4"><p className="responsive-table-ellipsis font-bold text-green-dark">{review.customerName ?? 'Verified Customer'}</p><p className="mt-0.5 text-[11px] text-muted">Order {review.orderNumber}</p></td>
                      <td className="w-[260px] max-w-[260px] overflow-hidden px-5 py-4"><p className="responsive-table-ellipsis text-xs font-semibold text-green-dark">{review.productName}</p>{review.productOptionLabel ? <p className="responsive-table-ellipsis mt-0.5 text-[11px] text-muted">{review.productOptionLabel}</p> : null}</td>
                      <td className="px-5 py-4"><div className="flex items-center gap-2"><ReviewStars value={review.rating} size={14} /><span className="font-bold text-orange">{review.rating}/5</span></div></td>
                      <td className="w-[420px] max-w-[420px] overflow-hidden px-5 py-4"><p className="responsive-table-ellipsis max-w-[400px] text-xs leading-5 text-muted">{review.content}</p></td>
                      <td className="px-5 py-4">{review.verifiedPurchase ? <VerifiedPurchaseBadge /> : <span className="text-xs text-muted">Not verified</span>}</td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusTone[review.status].className}`}>{statusTone[review.status].label}</span></td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${review.isFeatured ? 'bg-orange/10 text-orange' : 'bg-line text-muted'}`}>{review.isFeatured ? 'Featured' : 'Not featured'}</span></td>
                      <td className="px-5 py-4"><OrderInput value={review.displayOrder} isBusy={busyId === review.id} onSave={(displayOrder) => void saveOrder(review, displayOrder)} /></td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-muted">{formatDate(review.createdAt)}</td>
                      <td className="px-5 py-4"><ReviewActions review={review} isBusy={busyId === review.id || deletingId === review.id} onPreview={() => setPreviewStory(toPreviewStory(review))} onApprove={() => requestModeration(review, 'approve')} onReject={() => requestModeration(review, 'reject')} onToggleFeatured={() => void toggleFeatured(review)} onDelete={() => openDeleteConfirmation(review)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveDataTable>
          </div>
          {totalPages > 1 && <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-4"><button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={currentPage <= 1} onClick={() => setQuery((current) => ({ ...current, page: currentPage - 1 }))}>Previous</button><span className="text-xs font-bold text-muted">{currentPage} / {totalPages}</span><button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={currentPage >= totalPages} onClick={() => setQuery((current) => ({ ...current, page: currentPage + 1 }))}>Next</button></div>}
        </div>
      )}
      {previewStory && <StoryPreviewModal story={previewStory} onClose={() => setPreviewStory(null)} />}
      {reviewToModerate && (
        <ConfirmDialog
          eyebrow={reviewToModerate.action === 'approve' ? 'Approve review' : 'Reject review'}
          title={reviewToModerate.action === 'approve'
            ? `Approve the ${reviewToModerate.review.rating}-star review?`
            : `Reject the ${reviewToModerate.review.rating}-star review?`}
          description={reviewToModerate.action === 'approve'
            ? 'Approved reviews appear in the customer-facing storefront and count toward the product rating. This review will not be featured automatically.'
            : 'The review will remain saved in this portal for moderation, but it will be hidden from the storefront and will not count toward the product rating.'}
          isBusy={busyId === reviewToModerate.review.id}
          confirmLabel={reviewToModerate.action === 'approve' ? 'Approve review' : 'Reject review'}
          busyLabel="Updating…"
          onCancel={() => setReviewToModerate(null)}
          onConfirm={() => void confirmModeration()}
        />
      )}
      {reviewToDelete && (
        <ConfirmDialog
          eyebrow="Delete review"
          title={`Delete this review${reviewToDelete.customerName ? ` by ${reviewToDelete.customerName}` : ''}?`}
          description="The review will be permanently removed. This cannot be undone and does not affect the customer's order. Where possible, reject a review instead of deleting it."
          error={deleteError}
          isBusy={deletingId === reviewToDelete.id}
          confirmLabel="Delete permanently"
          busyLabel="Deleting…"
          onCancel={() => setReviewToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </>
  )
}