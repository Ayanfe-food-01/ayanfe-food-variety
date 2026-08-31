import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ContentTypeBadge } from '../../components/admin/ContentTypeBadge'
import { OrderInput } from '../../components/admin/OrderInput'
import { StoryPreviewModal } from '../../components/admin/StoryPreviewModal'
import { useToast } from '../../components/ui/Toast'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ApiError } from '../../services/api'
import {
  deleteAdminReview,
  getAdminReview,
  updateAdminReviewFeatured,
  updateAdminReviewOrder,
  updateAdminReviewStatus,
  type AdminReviewDetail,
} from '../../services/adminService'
import type { CustomerStory } from '../../services/storeSettingsService'
import { formatDate, formatReviewDate } from '../../utils/dateFormat'
import { ReviewStars } from '../../components/reviews/ReviewStars'
import { VerifiedPurchaseBadge } from '../../components/reviews/VerifiedPurchaseBadge'

type ModerationAction = 'approve' | 'reject' | 'feature' | 'unfeature' | 'delete'

const toPreviewStory = (review: AdminReviewDetail): CustomerStory => ({
  id: `review:${review.id}`,
  type: 'review',
  authorName: review.customerName ?? 'Verified Customer',
  content: review.content,
  rating: review.rating,
  verifiedPurchase: review.verifiedPurchase,
  createdAt: review.createdAt,
})

const statusLabel: Record<AdminReviewDetail['status'], { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-orange/10 text-orange' },
  APPROVED: { label: 'Approved', className: 'bg-sage text-green' },
  REJECTED: { label: 'Rejected', className: 'bg-line text-muted' },
}

export function ReviewDetail() {
  const { id = '' } = useParams()
  const { showToast } = useToast()
  const [review, setReview] = useState<AdminReviewDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<ModerationAction | null>(null)
  const [confirmAction, setConfirmAction] = useState<ModerationAction | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [previewStory, setPreviewStory] = useState<CustomerStory | null>(null)

  useEffect(() => {
    let current = true
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true)
      setError(null)
      getAdminReview(id)
        .then((loaded) => {
          if (current) setReview(loaded)
        })
        .catch((caught: unknown) => {
          if (current) setError(caught instanceof ApiError ? caught.message : 'The review could not be loaded.')
        })
        .finally(() => {
          if (current) setIsLoading(false)
        })
    }, 0)
    return () => {
      current = false
      window.clearTimeout(timeoutId)
    }
  }, [id])

  const performAction = async (action: ModerationAction) => {
    if (!review) return
    setBusyAction(action)
    setActionError(null)
    try {
      let updated: AdminReviewDetail
      switch (action) {
        case 'approve':
          updated = await updateAdminReviewStatus(review.id, 'APPROVED')
          showToast('Review approved.', 'success')
          break
        case 'reject':
          updated = await updateAdminReviewStatus(review.id, 'REJECTED')
          showToast('Review rejected.', 'success')
          break
        case 'feature':
        case 'unfeature':
          updated = await updateAdminReviewFeatured(review.id, action === 'feature')
          showToast(action === 'feature' ? 'Review marked as featured.' : 'Review removed from featured.', 'success')
          break
        case 'delete':
          await deleteAdminReview(review.id)
          showToast('Review deleted.', 'success')
          return
      }
      setReview(updated)
      setConfirmAction(null)
    } catch (caught: unknown) {
      const message = caught instanceof ApiError ? caught.message : 'The review could not be updated.'
      if (action === 'delete') setActionError(message)
      else showToast(message, 'error')
    } finally {
      setBusyAction(null)
    }
  }

  const saveOrder = async (displayOrder: number) => {
    if (!review) return
    setSavingOrder(true)
    setActionError(null)
    try {
      const updated = await updateAdminReviewOrder(review.id, displayOrder)
      setReview(updated)
      showToast(`Display order set to ${updated.displayOrder}.`, 'success')
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'Display order could not be updated.', 'error')
    } finally {
      setSavingOrder(false)
    }
  }

  const confirmLabel = (action: ModerationAction) => {
    switch (action) {
      case 'approve': return 'Approve review'
      case 'reject': return 'Reject review'
      case 'feature': return 'Mark as featured'
      case 'unfeature': return 'Remove from featured'
      case 'delete': return 'Delete permanently'
    }
  }

  if (isLoading) {
    return <div className="rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading review…</div>
  }

  if (error || !review) {
    return (
      <div className="rounded-2xl border border-orange/25 bg-orange/5 p-6 text-sm text-orange" role="alert">
        {error ?? 'Review not found.'}
      </div>
    )
  }

  const detailRow = (label: string, children: React.ReactNode) => (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  )

  const dialog = confirmAction
    ? (() => {
        const action = confirmAction
        const titles: Record<ModerationAction, string> = {
          approve: 'Approve this review?',
          reject: 'Reject this review?',
          feature: 'Feature this review on the homepage?',
          unfeature: 'Remove this review from the homepage?',
          delete: 'Delete this review permanently?',
        }
        const descriptions: Record<ModerationAction, string> = {
          approve: 'The review will appear in the storefront and count toward the product rating. It will not be featured automatically.',
          reject: 'The review will remain saved in this portal for moderation, but it will be hidden from the storefront and stop counting toward the product rating.',
          feature: 'The review will appear alongside other featured stories on the homepage.',
          unfeature: 'The review will no longer appear on the homepage, but it will stay visible on the product page.',
          delete: 'The review will be permanently removed. This cannot be undone and does not affect the customer\u2019s order. Where possible, reject a review instead of deleting it.',
        }
        const isFeature = action === 'feature' || action === 'unfeature'
        return (
          <ConfirmDialog
            eyebrow={isFeature ? 'Featured review' : action === 'delete' ? 'Delete review' : 'Moderate review'}
            title={titles[action]}
            description={descriptions[action]}
            error={actionError}
            isBusy={busyAction === action}
            confirmLabel={confirmLabel(action)}
            busyLabel="Updating…"
            onCancel={() => setConfirmAction(null)}
            onConfirm={() => void performAction(action)}
          />
        )
      })()
    : null

  return (
    <>
      <Link className="inline-flex items-center gap-1.5 text-sm font-bold text-green-dark hover:text-green" to="/admin/reviews">
        <span aria-hidden="true">←</span> All reviews
      </Link>

      <div className="mt-4 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Review details</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">
            {review.customerName ?? 'Verified Customer'}
          </h1>
          <p className="mt-3 flex items-center gap-3 text-sm text-muted">
            <ReviewStars value={review.rating} size={16} />
            <span className="font-semibold text-orange">{review.rating}/5</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl border border-line bg-white px-5 py-3 text-sm font-bold text-green-dark hover:bg-cream disabled:cursor-wait disabled:opacity-50" type="button" disabled={busyAction !== null} onClick={() => setPreviewStory(toPreviewStory(review))}>Preview homepage card</button>
          {(review.status === 'PENDING' || review.status === 'REJECTED') && (
            <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:cursor-wait disabled:opacity-50" type="button" disabled={busyAction !== null} onClick={() => setConfirmAction('approve')}>Approve</button>
          )}
          {review.status !== 'REJECTED' && (
            <button className="rounded-xl border border-line bg-white px-5 py-3 text-sm font-bold text-green-dark hover:bg-cream disabled:cursor-wait disabled:opacity-50" type="button" disabled={busyAction !== null} onClick={() => setConfirmAction('reject')}>Reject</button>
          )}
          {review.status === 'APPROVED' && (
            <button className="rounded-xl border border-line bg-white px-5 py-3 text-sm font-bold text-green-dark hover:bg-cream disabled:cursor-wait disabled:opacity-50" type="button" disabled={busyAction !== null} onClick={() => setConfirmAction(review.isFeatured ? 'unfeature' : 'feature')}>
              {review.isFeatured ? 'Remove from featured' : 'Mark as featured'}
            </button>
          )}
          <button className="rounded-xl border border-orange/25 bg-orange/5 px-5 py-3 text-sm font-bold text-orange hover:bg-orange/10 disabled:cursor-wait disabled:opacity-50" type="button" disabled={busyAction !== null} onClick={() => setConfirmAction('delete')}>Delete</button>
        </div>
      </div>

      {review.status === 'REJECTED' && (
        <p className="mt-5 rounded-xl border border-line bg-cream/60 px-4 py-3 text-xs text-muted">This review is rejected and hidden from customers. You can re-approve it if needed.</p>
      )}
      {review.status === 'PENDING' && (
        <p className="mt-5 rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-xs text-orange">This review is awaiting moderation. It is not shown to customers yet.</p>
      )}

      <dl className="mt-8 grid gap-x-6 gap-y-6 rounded-2xl border border-line bg-white p-5 text-sm text-green-dark shadow-sm sm:grid-cols-2 sm:p-6 lg:grid-cols-3 lg:gap-y-8">
        {detailRow('Customer', (
          <div>
            <p className="font-bold text-green-dark">{review.customerName ?? 'Verified Customer'}</p>
            {review.customerEmail && <p className="mt-0.5 text-xs text-muted">{review.customerEmail}</p>}
          </div>
        ))}
        {detailRow('Product', (
          <div>
            <p className="font-bold text-green-dark">{review.productName}</p>
            {review.productOptionLabel && <p className="mt-0.5 text-xs text-muted">Option: {review.productOptionLabel}</p>}
            <p className="mt-0.5 text-xs text-muted">Quantity: {review.productQuantity}</p>
          </div>
        ))}
        {detailRow('Order', (
          <p className="font-semibold text-green-dark">{review.orderNumber}</p>
        ))}
        {detailRow('Status', (
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusLabel[review.status].className}`}>{statusLabel[review.status].label}</span>
        ))}
        {detailRow('Content type', (
          <ContentTypeBadge type="review" />
        ))}
        {detailRow('Purchase', (
          review.verifiedPurchase ? <VerifiedPurchaseBadge /> : <span className="text-xs text-muted">Not verified</span>
        ))}
        {detailRow('Homepage featured', (
          review.status === 'APPROVED'
            ? <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${review.isFeatured ? 'bg-orange/10 text-orange' : 'bg-line text-muted'}`}>{review.isFeatured ? 'Featured' : 'Not featured'}</span>
            : <span className="text-xs text-muted">Only approved reviews can be featured</span>
        ))}
        {detailRow('Homepage order', (
          <OrderInput value={review.displayOrder} isBusy={savingOrder || busyAction !== null} onSave={(displayOrder) => void saveOrder(displayOrder)} />
        ))}
        {detailRow('Submitted', <span className="text-muted">{formatDate(review.createdAt, true)}</span>)}
        {detailRow('Purchased', review.orderCreatedAt ? <span className="text-muted">{formatDate(review.orderCreatedAt, true)}</span> : <span className="text-muted">—</span>)}
        {detailRow('Last updated', <span className="text-muted">{formatDate(review.updatedAt, true)}</span>)}
      </dl>

      <div className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Review</p>
        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-green-dark">{review.content}</p>
        <p className="mt-4 text-xs text-muted">{review.rating} out of 5 · {formatReviewDate(review.createdAt)}</p>
      </div>

      {previewStory && <StoryPreviewModal story={previewStory} onClose={() => setPreviewStory(null)} />}

      {dialog}
    </>
  )
}