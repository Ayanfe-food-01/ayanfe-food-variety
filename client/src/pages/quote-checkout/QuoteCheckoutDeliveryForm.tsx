import {
  checkoutFieldsetClassName,
  checkoutInputClassName,
  checkoutDescriptionClassName,
  checkoutLegendClassName,
  checkoutSectionClassName,
} from '../../components/checkout/checkoutStyles'

interface QuoteCheckoutDeliveryFormProps {
  address: string
  city: string
  instructions: string
  error: string | null
  onChangeAddress: (value: string) => void
  onChangeCity: (value: string) => void
  onChangeInstructions: (value: string) => void
}

export function QuoteCheckoutDeliveryForm({
  address,
  city,
  instructions,
  error,
  onChangeAddress,
  onChangeCity,
  onChangeInstructions,
}: QuoteCheckoutDeliveryFormProps) {
  return (
    <section className={checkoutSectionClassName}>
      <fieldset className={checkoutFieldsetClassName}>
        <legend className={checkoutLegendClassName}>Delivery details</legend>
        <p className={checkoutDescriptionClassName}>
          The delivery fee was included in the accepted quotation. Tell us where to deliver it.
        </p>
        <div className={`mt-6 space-y-5 ${error ? 'rounded-2xl border border-orange/30 bg-orange/5 p-5' : ''}`}>
          <label className="block text-sm font-bold text-green-dark">
            Delivery address <span className="text-orange">*</span>
            <textarea
              className={checkoutInputClassName(Boolean(error))}
              rows={3}
              maxLength={2000}
              placeholder="Street address, area, landmark"
              value={address}
              onChange={(event) => onChangeAddress(event.target.value)}
            />
          </label>
          <label className="block text-sm font-bold text-green-dark">
            City <span className="text-orange">*</span>
            <input
              className={checkoutInputClassName(Boolean(error))}
              maxLength={120}
              placeholder="Your city"
              value={city}
              onChange={(event) => onChangeCity(event.target.value)}
            />
          </label>
          <label className="block text-sm font-bold text-green-dark">
            Delivery instructions <span className="font-normal text-muted">(optional)</span>
            <textarea
              className={checkoutInputClassName(false)}
              rows={3}
              maxLength={2000}
              placeholder="Anything the delivery team should know"
              value={instructions}
              onChange={(event) => onChangeInstructions(event.target.value)}
            />
          </label>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-orange" role="alert">{error}</p>}
      </fieldset>
    </section>
  )
}