import { formatPrice } from '../../../../utils/formatPrice'
import { MAX_DELIVERY_FEE, type QuoteDeliveryFeeOption, type QuoteFulfillmentOption } from './constants'

const FEE_MODE_OPTIONS: Array<{ value: QuoteDeliveryFeeOption; label: string; hint: string }> = [
  { value: 'ZONE', label: 'Zone rate', hint: 'Resolved from the customer’s delivery zone and locked for this quote.' },
  { value: 'FREE', label: 'Free delivery', hint: 'Lock the delivery fee at zero.' },
  { value: 'CUSTOM', label: 'Custom amount', hint: 'Lock a fixed delivery fee for this quote.' },
]

interface QuoteDetailFulfillmentCardProps {
  fulfillmentMethod: QuoteFulfillmentOption
  onFulfillmentMethodChange: (value: QuoteFulfillmentOption) => void
  deliveryFeeMode: QuoteDeliveryFeeOption
  onDeliveryFeeModeChange: (value: QuoteDeliveryFeeOption) => void
  deliveryFeeInput: string
  onDeliveryFeeInputChange: (value: string) => void
  subtotalCents: number
  deliveryFeeCents: number
  deliveryFeeIsBlank: boolean
  totalCents: number
  quotationError: string | null
  isPreparingQuotation: boolean
  onPrepare: () => void
}

export function QuoteDetailFulfillmentCard({
  fulfillmentMethod,
  onFulfillmentMethodChange,
  deliveryFeeMode,
  onDeliveryFeeModeChange,
  deliveryFeeInput,
  onDeliveryFeeInputChange,
  subtotalCents,
  deliveryFeeCents,
  deliveryFeeIsBlank,
  totalCents,
  quotationError,
  isPreparingQuotation,
  onPrepare,
}: QuoteDetailFulfillmentCardProps) {
  const isDelivery = fulfillmentMethod === 'DELIVERY'
  const zoneFeeUnknown = isDelivery && deliveryFeeMode === 'ZONE'

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-green-dark">Fulfillment method</h2>
      <p className="mt-1 text-sm text-muted">Choose how the customer receives this order.</p>
      <div className="mt-4 flex flex-row items-center gap-2">
        {(['PICKUP', 'DELIVERY'] as const).map((option) => (
          <button
            className={`rounded-xl border px-5 py-3 text-sm font-bold transition-colors ${
              fulfillmentMethod === option
                ? 'border-green bg-sage text-green-dark'
                : 'border-line bg-cream/40 text-muted hover:border-green/40'
            }`}
            key={option}
            type="button"
            role="radio"
            aria-checked={fulfillmentMethod === option}
            onClick={() => onFulfillmentMethodChange(option)}
          >
            {option === 'PICKUP' ? 'Pickup' : 'Delivery'}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        {fulfillmentMethod === 'PICKUP'
          ? 'No delivery fee applies. The customer collects the order from the store.'
          : 'Choose how the delivery fee is set for this quotation.'}
      </p>

      {isDelivery && (
        <div className="mt-4">
          <p className="text-sm font-bold text-green-dark">Delivery fee</p>
          <div className="mt-2 grid gap-2">
            {FEE_MODE_OPTIONS.map((option) => {
              const selected = deliveryFeeMode === option.value
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                    selected ? 'border-green bg-sage/35' : 'border-line bg-white hover:bg-sage/20'
                  }`}
                >
                  <input
                    className="mt-0.5"
                    type="radio"
                    name="quote-delivery-fee-mode"
                    value={option.value}
                    checked={selected}
                    onChange={() => onDeliveryFeeModeChange(option.value)}
                  />
                  <span>
                    <span className="block text-sm font-bold text-green-dark">{option.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted">{option.hint}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {isDelivery && deliveryFeeMode === 'CUSTOM' && (
        <label className="mt-4 block text-sm font-bold text-green-dark" htmlFor="quote-delivery-fee">
          Custom delivery fee <span className="text-orange" aria-hidden="true">*</span>
          <div className="mt-2 flex items-center rounded-xl border border-line bg-cream focus-within:border-green focus-within:ring-2 focus-within:ring-green/10">
            <span className="pl-3 text-sm font-bold text-muted">₦</span>
            <input
              className="w-full bg-transparent px-3 py-2.5 text-right text-sm font-bold text-green-dark outline-none"
              id="quote-delivery-fee"
              inputMode="decimal"
              placeholder="Enter an amount"
              value={deliveryFeeInput}
              onChange={(event) => onDeliveryFeeInputChange(event.target.value)}
            />
          </div>
          <span className="mt-1 block text-[10px] text-muted">Max {formatPrice(MAX_DELIVERY_FEE)}</span>
        </label>
      )}

      <dl className="mt-5 w-full space-y-2 rounded-xl border border-line bg-sage/25 p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Items subtotal</dt>
          <dd className="font-bold text-green-dark">{formatPrice(subtotalCents / 100)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Delivery fee</dt>
          <dd className="font-bold text-green-dark">
            {fulfillmentMethod === 'PICKUP' || deliveryFeeMode === 'FREE'
              ? 'Free'
              : zoneFeeUnknown
                ? 'From delivery zone'
                : deliveryFeeIsBlank
                  ? 'Enter an amount'
                  : formatPrice(deliveryFeeCents / 100)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
          <dt className="font-semibold text-green-dark">Quoted total</dt>
          <dd className="text-lg font-bold text-green">{formatPrice((fulfillmentMethod === 'PICKUP' || zoneFeeUnknown ? subtotalCents : totalCents) / 100)}</dd>
        </div>
        {zoneFeeUnknown && (
          <p className="pt-1 text-[11px] leading-4 text-muted">
            The delivery fee is resolved from the customer’s delivery zone when the quotation is prepared.
          </p>
        )}
      </dl>

      {quotationError && <div className="mt-4 rounded-xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{quotationError}</div>}

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-3 text-xs text-muted">Submitting moves this request to <strong className="font-bold text-green-dark">Quoted</strong> and locks the prices and fulfillment method.</p>
        <div className="flex justify-end">
          <button
            className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream disabled:cursor-not-allowed disabled:opacity-50 hover:bg-green-dark"
            type="button"
            disabled={isPreparingQuotation}
            onClick={onPrepare}
          >
            {isPreparingQuotation ? 'Preparing…' : 'Prepare quotation'}
          </button>
        </div>
      </div>
    </div>
  )
}