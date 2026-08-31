import { Link } from 'react-router-dom'
import type { UseProductReviewsResult } from '../../hooks/useProductReviews'
import type { ProductRatingDistribution, ProductReviewItem } from '../../services/reviewService'
import { formatReviewDate } from '../../utils/dateFormat'
import { ReviewStars } from './ReviewStars'

interface ProductReviewsSectionProps {
  reviews: UseProductReviewsResult
}

const STAR_ROWS: Array<keyof ProductRatingDistribution> = ['5', '4', '3', '2', '1']

const distributionPercentages = (
  distribution: ProductRatingDistribution,
  total: number,
): Record<keyof ProductRatingDistribution, number> => {
  const percentages = {} as Record<keyof ProductRatingDistribution, number>
  for (const star of STAR_ROWS) {
    percentages[star] = total > 0 ? Math.round((distribution[star] / total) * 100) : 0
  }
  return percentages
}

function ReviewCard({ review }: { review: ProductReviewItem }) {
  return (
    <li className="py-6 sm:py-7">
      <article aria-label={`Review by ${review.authorName}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <ReviewStars
            value={review.rating}
            size={16}
            label={`${review.rating} out of 5 stars`}
          />
        </div>
        <blockquote className="mt-3 text-sm leading-6 text-muted sm:text-base sm:leading-7">
          “{review.content}”
        </blockquote>
        <footer className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
          <span className="font-bold text-green-dark">{review.authorName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={review.createdAt}>{formatReviewDate(review.createdAt)}</time>
        </footer>
      </article>
    </li>
  )
}

function RatingBreakdown({ distribution, total }: { distribution: ProductRatingDistribution; total: number }) {
  const percentages = distributionPercentages(distribution, total)
  return (
    <div className="mt-6 space-y-2.5" aria-label="Rating breakdown">
      {STAR_ROWS.map((star) => {
        const count = distribution[star]
        const percentage = percentages[star]
        return (
          <div
            className="flex items-center gap-3"
            aria-label={`${percentage}% of reviews rated ${star} star${star === '1' ? '' : 's'}`}
            key={star}
          >
            <span className="w-4 shrink-0 text-xs font-bold text-green-dark" aria-hidden="true">{star}</span>
            <span className="sr-only">{`${star} star${star === '1' ? '' : 's'}`}</span>
            <div
              className="relative h-2 flex-1 overflow-hidden rounded-full bg-sage"
              role="presentation"
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-orange"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-xs font-semibold text-muted">
              {percentage}%
            </span>
            <span className="sr-only">
              {count} review{count === 1 ? '' : 's'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function ProductReviewsSection({ reviews }: ProductReviewsSectionProps) {
  const { summary, items, reviewAction, status, errorMessage, hasMore, isLoadingMore, loadMore } = reviews

  const reviewCount = summary?.reviewCount ?? 0
  const averageRating = summary?.averageRating ?? null
  const roundedStars = averageRating !== null ? Number(averageRating.toFixed(1)) : null

  return (
    <section className="border-t border-line bg-white py-14 sm:py-18 lg:py-24" aria-labelledby="customer-reviews-heading">
      <div className="container">
        <div className="mb-10 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-orange">Customer reviews</p>
            <h2 id="customer-reviews-heading" className="m-0 text-3xl font-bold tracking-[-0.04em] text-green-dark sm:text-4xl">
              Reviews &amp; ratings
            </h2>
          </div>
          {status === 'ready' && reviewAction && (
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full bg-green px-6 text-sm font-bold text-cream shadow-lg shadow-green/15 transition-all hover:-translate-y-0.5 hover:bg-green-dark"
              to={`/orders/${encodeURIComponent(reviewAction.orderNumber)}/review/${encodeURIComponent(reviewAction.orderItemId)}`}
            >
              Write a Review
            </Link>
          )}
        </div>

        {status === 'loading' && (
          <div className="animate-pulse" aria-busy="true" aria-label="Loading customer reviews">
            <div className="h-8 w-40 rounded bg-sage" />
            <div className="mt-6 h-24 max-w-md rounded-2xl bg-sage" />
            <div className="mt-4 h-24 max-w-md rounded-2xl bg-sage" />
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-2xl border border-dashed border-line bg-sage/30 px-6 py-10 text-center">
            <p className="m-0 text-sm text-muted">
              {errorMessage ?? 'The reviews could not be loaded right now.'}
            </p>
          </div>
        )}

        {status === 'ready' && reviewCount === 0 && (
          <div className="rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-14 text-center">
            <p className="m-0 text-sm text-muted">
              No reviews yet. Be the first to review this product after your purchase.
            </p>
            {reviewAction && (
              <Link
                className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-green px-6 text-sm font-bold text-cream shadow-lg shadow-green/15 transition-all hover:-translate-y-0.5 hover:bg-green-dark"
                to={`/orders/${encodeURIComponent(reviewAction.orderNumber)}/review/${encodeURIComponent(reviewAction.orderItemId)}`}
              >
                Write a Review
              </Link>
            )}
          </div>
        )}

        {status === 'ready' && reviewCount > 0 && summary !== null && (
          <div className="grid gap-12 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-16">
            <aside aria-label="Rating summary">
              <div aria-label={`Average rating ${roundedStars} out of 5, based on ${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}`}>
                {roundedStars !== null && (
                  <div className="flex items-end gap-3">
                    <span className="text-5xl font-bold leading-none tracking-[-0.04em] text-green-dark">{roundedStars.toFixed(1)}</span>
                    <span className="text-base font-semibold text-muted">out of 5</span>
                  </div>
                )}
                <ReviewStars value={roundedStars ?? 0} size={22} label={`${roundedStars ?? 0} out of 5 stars`} />
                <p className="mt-2 text-sm text-muted">
                  Based on {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                </p>
              </div>
              <RatingBreakdown distribution={summary.distribution} total={reviewCount} />
            </aside>

            <div>
              <ol className="m-0 list-none p-0 divide-y divide-line">
                {items.map((review) => (
                  <ReviewCard review={review} key={review.id} />
                ))}
              </ol>
              {hasMore && (
                <button
                  className="mt-7 inline-flex h-11 items-center justify-center rounded-full border border-green/25 px-6 text-sm font-bold text-green transition-colors hover:bg-green hover:text-cream disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  aria-label="Load more reviews"
                  disabled={isLoadingMore}
                  onClick={() => void loadMore()}
                >
                  {isLoadingMore ? 'Loading…' : 'Load more reviews'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}