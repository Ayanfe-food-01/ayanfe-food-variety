import { Link } from 'react-router-dom'
import { ArrowRight, CheckIcon } from '../../../assets/icons'
import type { QuoteRequest } from '../../../services/quoteService'

interface RequestQuoteSuccessCardProps {
  quoteRequest: QuoteRequest
  firstName?: string
  canViewOrders: boolean
}

export function RequestQuoteSuccessCard({ quoteRequest, firstName, canViewOrders }: RequestQuoteSuccessCardProps) {
  return (
    <section className="rounded-3xl border border-line bg-white px-6 py-12 text-center shadow-sm sm:px-12" aria-live="polite">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-green/10">
        <CheckIcon className="text-green" size={32} />
      </span>
      <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Quote request received</p>
      <h2 className="m-0 mt-2 text-3xl font-bold tracking-[-0.04em] text-green-dark sm:text-4xl">
        Thank you{firstName ? `, ${firstName}` : ''}!
      </h2>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
        Your quote request has been received. We&rsquo;ll review your request and get back to you.
      </p>
      <p className="mx-auto mt-4 max-w-md rounded-xl bg-sage/35 px-4 py-3 text-sm font-semibold text-green-dark">
        Reference: {quoteRequest.quoteNumber}
      </p>
      <p className="mx-auto mt-4 max-w-md text-xs leading-5 text-muted">
        Please keep the reference above for any follow-up. We aim to respond to quote requests promptly.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link className="inline-flex items-center gap-2 rounded-full bg-green px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark" to="/shop">
          Continue shopping <ArrowRight size={16} />
        </Link>
        {canViewOrders && (
          <Link className="inline-flex items-center gap-2 rounded-full border border-green/20 px-6 py-3 text-sm font-bold text-green transition-colors hover:bg-green hover:text-cream" to="/orders">
            View your orders
          </Link>
        )}
      </div>
    </section>
  )
}