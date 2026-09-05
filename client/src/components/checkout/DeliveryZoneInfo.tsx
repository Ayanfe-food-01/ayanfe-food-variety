import type { ResolvedDeliveryZone } from '../../services/orderService'
import { formatNaira } from './checkoutFormat'

// Informational, read-only summary of the delivery zone auto-resolved for the
// selected city. The customer only chooses a state and city; the zone, fee,
// and estimated delivery time are derived. The client never trusts these
// values for the final total — the server recomputes them at checkout.
interface DeliveryZoneInfoProps {
  zone: ResolvedDeliveryZone | null
  isResolving: boolean
  error: string | null
  deliveryFee: number | null
  whatsappUrl: string | null
}

export function DeliveryZoneInfo({ zone, isResolving, error, deliveryFee, whatsappUrl }: DeliveryZoneInfoProps) {
  if (isResolving) {
    return (
      <div className="rounded-2xl border border-line bg-cream/40 p-5" aria-live="polite">
        <p className="flex items-center gap-2.5 text-sm text-muted" role="status">
          <span className="size-4 animate-spin rounded-full border-2 border-green border-t-transparent" aria-hidden="true" />
          Checking delivery for this location…
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-orange/25 bg-orange/5 p-5" role="alert">
        <p className="text-sm text-orange">{error}</p>
      </div>
    )
  }

  if (!zone) {
    return (
      <div className="rounded-2xl border border-line bg-cream/40 p-5">
        <p className="text-sm font-semibold text-green-dark">We currently don&#39;t deliver to this area.</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          Please contact us on WhatsApp to check availability.
          {whatsappUrl ? (
            <a
              className="ml-1.5 font-bold text-green underline underline-offset-2 transition-colors hover:text-orange"
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
            >
              Chat with us
            </a>
          ) : null}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-green/25 bg-sage/30 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Delivery zone</p>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-baseline gap-2">
          <dt className="text-muted">Zone</dt>
          <dd className="font-bold text-green-dark">{zone.label}</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-muted">Delivery fee</dt>
          <dd className="font-bold text-green-dark">
            {deliveryFee === 0 ? 'Free delivery' : formatNaira(deliveryFee ?? zone.fee)}
          </dd>
        </div>
        {zone.minDeliveryDays && zone.maxDeliveryDays ? (
          <div className="flex items-baseline gap-2">
            <dt className="text-muted">Estimated delivery</dt>
            <dd className="font-bold text-green-dark">
              {zone.minDeliveryDays === zone.maxDeliveryDays
                ? `${zone.minDeliveryDays} business day${zone.minDeliveryDays === 1 ? '' : 's'}`
                : `${zone.minDeliveryDays}–${zone.maxDeliveryDays} business days`}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}