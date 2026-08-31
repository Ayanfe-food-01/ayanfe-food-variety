import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { StarRating } from '../components/reviews/StarRating'
import { SubmitButton } from '../components/ui/SubmitButton'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { ApiError } from '../services/api'
import { getOrderReviewEligibility, submitProductReview, type ReviewEligibilityItem } from '../services/reviewService'
import type { CustomerPaymentStatus, OrderStatus } from '../services/orderService'
import { formatOrderStatus } from '../utils/orderStatus'
import { scrollToTopInstant } from '../utils/browserCompatibility'

const MAX_REVIEW_LENGTH = 2000
const MIN_REVIEW_LENGTH = 10

export function WriteReview() {
  const { orderNumber, orderItemId } = useParams<{ orderNumber: string; orderItemId: string }>()
  const { user, isLoading: isAuthLoading, openAuth } = useCustomerAuth()
  const [eligibility, setEligibility] = useState<{ items: ReviewEligibilityItem[]; orderStatus: OrderStatus; paymentStatus: CustomerPaymentStatus } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [ratingError, setRatingError] = useState<string | null>(null)
  const [contentError, setContentError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (isAuthLoading || !user || !orderNumber) return
    let current = true
    getOrderReviewEligibility(orderNumber)
      .then((loaded) => {
        if (!current) return
        setEligibility({
          items: loaded.items,
          orderStatus: loaded.orderStatus,
          paymentStatus: loaded.paymentStatus,
        })
      })
      .catch((caught: unknown) => {
        if (current) setLoadError(caught instanceof ApiError ? caught.message : 'Review eligibility could not be loaded.')
      })
      .finally(() => {
        if (current) setIsLoading(false)
      })
    return () => {
      current = false
    }
  }, [isAuthLoading, orderNumber, user])

  const item = eligibility?.items.find((candidate) => candidate.id === orderItemId) ?? null

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!orderNumber || !item || isSubmitting) return
    const trimmedContent = content.trim()
    let hasError = false
    setError(null)

    if (rating < 1 || rating > 5) {
      setRatingError('Select a star rating between 1 and 5.')
      hasError = true
    } else {
      setRatingError(null)
    }

    if (!trimmedContent) {
      setContentError('Write your review.')
      hasError = true
    } else if (trimmedContent.length < MIN_REVIEW_LENGTH) {
      setContentError(`Your review must be at least ${MIN_REVIEW_LENGTH} characters.`)
      hasError = true
    } else if (trimmedContent.length > MAX_REVIEW_LENGTH) {
      setContentError(`Your review must be ${MAX_REVIEW_LENGTH} characters or fewer.`)
      hasError = true
    } else {
      setContentError(null)
    }

    if (hasError) return
    setIsSubmitting(true)
    try {
      await submitProductReview(orderNumber, { orderItemId: item.id, rating, content: trimmedContent })
      setSubmitted(true)
      scrollToTopInstant()
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Your review could not be submitted.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderSignInPrompt = () => (
    <div className="mx-auto max-w-3xl">
      <Link className="text-sm font-bold text-green hover:text-orange" to="/orders">← Back to orders</Link>
      <div className="mt-6 rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-green-dark">Sign in to write a review</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Reviews are tied to a verified purchase, so only signed-in customers can review items from their own orders.</p>
        <button className="mt-6 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="button" onClick={() => openAuth()}>
          Sign in to your account
        </button>
      </div>
    </div>
  )

  return (
    <>
      <Navbar />
      <main className="container py-12 sm:py-16 lg:py-24">
        {!isAuthLoading && !user ? renderSignInPrompt() : loadError ? (
          <div className="mx-auto max-w-3xl">
            <Link className="text-sm font-bold text-green hover:text-orange" to="/orders">← Back to orders</Link>
            <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">{loadError}</div>
          </div>
        ) : isLoading || (!eligibility && isAuthLoading) ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted">Loading…</p>
        ) : !item ? (
          <div className="mx-auto max-w-3xl">
            <Link className="text-sm font-bold text-green hover:text-orange" to={`/orders/${orderNumber}`}>← Back to order</Link>
            <div className="mt-6 rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">This item is not part of this order.</div>
          </div>
        ) : submitted ? (
          <div className="mx-auto max-w-3xl">
            <div className="rounded-3xl border border-green/20 bg-sage/30 p-8 text-center shadow-sm sm:p-12">
              <h1 className="text-3xl font-bold text-green-dark">Review submitted</h1>
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
                Thank you for your review. Your review has been submitted and is awaiting approval.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link className="rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" to={`/orders/${orderNumber}`}>Back to order</Link>
                <Link className="rounded-full border border-line bg-white px-5 py-3 text-sm font-bold text-green-dark hover:bg-cream" to="/shop">Continue shopping</Link>
              </div>
            </div>
          </div>
        ) : item.reviewed ? (
          <div className="mx-auto max-w-3xl">
            <Link className="text-sm font-bold text-green hover:text-orange" to={`/orders/${orderNumber}`}>← Back to order</Link>
            <div className="mt-6 rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">You have already reviewed this item.</div>
          </div>
        ) : !item.canReview ? (
          <div className="mx-auto max-w-3xl">
            <Link className="text-sm font-bold text-green hover:text-orange" to={`/orders/${orderNumber}`}>← Back to order</Link>
            <div className="mt-6 rounded-2xl border border-line bg-white p-8 text-center text-sm leading-6 text-muted">
              This item can only be reviewed once the order has been delivered and paid for. Current status:{' '}
              <strong className="text-green-dark">{formatOrderStatus(eligibility!.orderStatus)}</strong> · Payment{' '}
              <strong className="text-green-dark">{eligibility!.paymentStatus}</strong>.
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            <Link className="text-sm font-bold text-green hover:text-orange" to={`/orders/${orderNumber}`}>← Back to order</Link>
            <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Write a review</p>
              <h1 className="mt-2 text-3xl font-bold tracking-[-0.05em] text-green-dark sm:text-4xl">How was it?</h1>
              <div className="mt-6 flex items-start gap-4 rounded-2xl border border-line bg-cream/50 p-4">
                {item.productImage && <img className="size-20 shrink-0 rounded-2xl object-cover" src={item.productImage} alt="" />}
                <div className="min-w-0">
                  <p className="font-bold text-green-dark">{item.productName}</p>
                  {item.productOptionLabel && <p className="mt-1 text-xs font-semibold text-orange">{item.productOptionLabel}</p>}
                  <p className="mt-1 text-xs text-muted">Bought {item.quantity} {item.quantity === 1 ? 'unit' : 'units'}</p>
                </div>
              </div>
              <form className="mt-8 space-y-6" onSubmit={submit}>
                <fieldset>
                  <legend className="text-sm font-bold text-green-dark">Your rating</legend>
                  <div className="mt-3">
                    <StarRating
                      value={rating}
                      error={ratingError ?? undefined}
                      onChange={(value) => {
                        setRating(value)
                        setRatingError(null)
                      }}
                    />
                  </div>
                </fieldset>
                <label className="block text-sm font-bold text-green-dark">
                  Your review
                  <textarea
                    className="mt-2 min-h-32 w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
                    value={content}
                    onChange={(event) => {
                      setContent(event.target.value)
                      setContentError(null)
                    }}
                    maxLength={MAX_REVIEW_LENGTH}
                    placeholder="What did you like about it?"
                  />
                  <span className="mt-1 block text-xs font-normal text-muted">{content.length}/{MAX_REVIEW_LENGTH} characters</span>
                  {contentError && <p className="mt-2 text-xs font-normal text-orange" role="alert">{contentError}</p>}
                </label>
                {error && <p className="rounded-xl border border-orange/25 bg-orange/5 p-3 text-sm text-orange" role="alert">{error}</p>}
                <div className="flex flex-wrap gap-3">
                  <SubmitButton busy={isSubmitting} busyLabel="Submitting…">Submit review</SubmitButton>
                  <Link className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark" to={`/orders/${orderNumber}`}>Cancel</Link>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}