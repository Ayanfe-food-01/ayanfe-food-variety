import { ArrowRight } from '../../assets/icons'
import type { DeliveryLocationState, ResolvedDeliveryZone } from '../../services/orderService'
import type { PaymentSettings } from '../../services/storeSettingsService'
import type { CheckoutFormData, CheckoutStep } from './types'
import {
  checkoutDescriptionClassName,
  checkoutFieldsetClassName,
  checkoutLegendClassName,
  checkoutSectionClassName,
} from './checkoutStyles'
import { formatNaira } from './checkoutFormat'

interface ReviewStepProps {
  form: CheckoutFormData
  locations: DeliveryLocationState[] | null
  resolvedZone: ResolvedDeliveryZone | null
  isZoneResolving: boolean
  deliveryFee: number | null
  paymentSettings: PaymentSettings | null
  needsCartReview: boolean
  submitError: string | null
  canPlaceOrder: boolean
  isSubmitting: boolean
  onPlaceOrder: () => void
  onEditStep: (step: CheckoutStep) => void
}

interface ReviewSectionProps {
  title: string
  editStep: CheckoutStep
  onEditStep: (step: CheckoutStep) => void
  children: React.ReactNode
}

function ReviewSection({ title, editStep, onEditStep, children }: ReviewSectionProps) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="m-0 text-sm font-bold uppercase tracking-[0.12em] text-green-dark">{title}</h3>
        <button
          className="text-xs font-bold text-green underline underline-offset-2 transition-colors hover:text-orange"
          type="button"
          onClick={() => onEditStep(editStep)}
        >
          Edit
        </button>
      </div>
      <div className="mt-4 space-y-1.5 text-sm">{children}</div>
    </section>
  )
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-green-dark">{value}</dd>
    </div>
  )
}

export function ReviewStep({
  form,
  locations,
  resolvedZone,
  isZoneResolving,
  deliveryFee,
  paymentSettings,
  needsCartReview,
  submitError,
  canPlaceOrder,
  isSubmitting,
  onPlaceOrder,
  onEditStep,
}: ReviewStepProps) {
  const stateName = locations?.find((state) => state.id === form.state)?.name ?? ''
  const isDelivery = form.fulfillmentMethod === 'DELIVERY'

  return (
    <section className={checkoutSectionClassName}>
      <fieldset className={checkoutFieldsetClassName}>
        <legend className={checkoutLegendClassName}>Review your order</legend>
        <p className={checkoutDescriptionClassName}>
          Double-check everything below before placing your order. Use Edit to go back and change any detail.
        </p>

        <div className="mt-6 space-y-4">
          <ReviewSection title="Contact details" editStep="contact" onEditStep={onEditStep}>
            <ReviewRow label="Full name" value={form.fullName} />
            <ReviewRow label="Phone" value={form.phone} />
            <ReviewRow label="Email" value={form.email} />
          </ReviewSection>

          <ReviewSection title="Delivery method" editStep="delivery" onEditStep={onEditStep}>
            <ReviewRow
              label="Method"
              value={isDelivery ? 'Delivery' : form.fulfillmentMethod === 'PICKUP' ? 'Pickup' : 'Not selected'}
            />
            {isDelivery ? (
              <>
                <ReviewRow label="Address" value={form.address} />
                {form.state ? <ReviewRow label="State" value={stateName || form.state} /> : null}
                {form.city ? <ReviewRow label="City / LGA" value={form.city} /> : null}
                {form.area ? <ReviewRow label="Area" value={form.area} /> : null}
                <dd>
                  <dt className="text-muted">Delivery</dt>
                  <p className="mt-1 font-semibold text-green-dark">
                    {isZoneResolving
                      ? 'Checking your delivery zone…'
                      : resolvedZone
                        ? `${resolvedZone.label} · ${deliveryFee === 0 ? 'Free delivery' : formatNaira(deliveryFee ?? resolvedZone.fee)}`
                        : 'Delivery is unavailable for your selected city.'}
                  </p>
                </dd>
                {form.deliveryInstructions.trim() ? (
                  <ReviewRow label="Instructions" value={form.deliveryInstructions.trim()} />
                ) : null}
              </>
            ) : (
              <ReviewRow
                label="Total"
                value={form.fulfillmentMethod === 'PICKUP' ? 'No delivery fee' : '—'}
              />
            )}
          </ReviewSection>

          <ReviewSection title="Payment method" editStep="payment" onEditStep={onEditStep}>
            <ReviewRow
              label="Method"
              value={paymentSettings?.paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' : paymentSettings?.paymentMethod === 'PAYSTACK' ? 'Paystack' : '—'}
            />
            {paymentSettings?.paymentMethod === 'BANK_TRANSFER' && (
              <>
                <ReviewRow label="Bank" value={paymentSettings.bankName} />
                <ReviewRow label="Account name" value={paymentSettings.accountName} />
                <ReviewRow label="Account number" value={paymentSettings.accountNumber} />
              </>
            )}
            {paymentSettings?.paymentMethod === 'PAYSTACK' && (
              <ReviewRow label="Payment" value="Secure online payment via Paystack" />
            )}
          </ReviewSection>
        </div>

        <div className="mt-10">
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green py-4 text-sm font-bold text-cream shadow-lg shadow-green/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-dark focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={onPlaceOrder}
            disabled={!canPlaceOrder}
          >
            {isSubmitting ? 'Processing…' : 'Place order'} {!isSubmitting && <ArrowRight size={17} />}
          </button>
          {submitError && !needsCartReview && (
            <p className="mt-3 text-center text-sm font-medium text-orange" role="alert">{submitError}</p>
          )}
          <p className="mt-3 text-center text-xs text-muted">
            Prices and totals are confirmed by the server when you place the order.
          </p>
        </div>
      </fieldset>
    </section>
  )
}