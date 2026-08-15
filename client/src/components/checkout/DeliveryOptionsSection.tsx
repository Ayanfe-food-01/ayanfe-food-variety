import type { FulfillmentMethod } from '../../services/orderService'
import type { CheckoutField, CheckoutFormData, CheckoutFormErrors } from './types'
import {
  checkoutDescriptionClassName,
  checkoutFieldsetClassName,
  checkoutInputClassName,
  checkoutLegendClassName,
  checkoutSectionClassName,
} from './checkoutStyles'
import { CheckoutFieldError } from './CheckoutFormSections'

interface DeliveryOptionsSectionProps {
  form: CheckoutFormData
  errors: CheckoutFormErrors
  fulfillmentMethod: FulfillmentMethod | ''
  onChange: (field: CheckoutField, value: string) => void
}

const deliveryOptions = [
  ['PICKUP', 'Pickup', 'Collect your order from the store. No delivery fee.'],
  ['DELIVERY', 'Delivery', 'Have your order brought to your delivery address.'],
] as const

export function DeliveryOptionsSection({
  form,
  errors,
  fulfillmentMethod,
  onChange,
}: DeliveryOptionsSectionProps) {
  const isDelivery = fulfillmentMethod === 'DELIVERY'

  return (
    <section className={checkoutSectionClassName}>
      <fieldset className={checkoutFieldsetClassName}>
        <legend className={checkoutLegendClassName}>Delivery method</legend>
        <p className={checkoutDescriptionClassName}>
          Choose pickup or delivery. This selection is saved with your order and cannot change after it is placed.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {deliveryOptions.map(([value, label, description]) => (
            <label
              className={`block cursor-pointer rounded-2xl border p-5 transition-colors ${
                fulfillmentMethod === value
                  ? 'border-green bg-sage/30'
                  : 'border-line bg-white hover:border-green/40'
              }`}
              key={value}
            >
              <span className="flex items-start gap-3">
                <input
                  className="mt-1 size-4 accent-green"
                  type="radio"
                  name="fulfillmentMethod"
                  value={value}
                  checked={fulfillmentMethod === value}
                  onChange={() => onChange('fulfillmentMethod', value)}
                  aria-describedby="fulfillmentMethod-error"
                />
                <span>
                  <span className="block text-sm font-bold text-green-dark">{label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
        <CheckoutFieldError id="fulfillmentMethod" message={errors.fulfillmentMethod} />

        {isDelivery && (
          <div className="mt-8 grid gap-6">
            <div>
              <label className="text-sm font-bold text-green-dark" htmlFor="address">
                Delivery address <span className="text-orange" aria-hidden="true">*</span>
              </label>
              <textarea
                className={`${checkoutInputClassName(Boolean(errors.address))} min-h-28 resize-y`}
                id="address"
                name="address"
                autoComplete="street-address"
                placeholder="House number, street name, landmark"
                value={form.address}
                onChange={(event) => onChange('address', event.target.value)}
                aria-invalid={Boolean(errors.address)}
                aria-describedby={errors.address ? 'address-error' : undefined}
                required
              />
              <CheckoutFieldError id="address" message={errors.address} />
            </div>

            <div>
              <label className="text-sm font-bold text-green-dark" htmlFor="city">
                City or location <span className="text-orange" aria-hidden="true">*</span>
              </label>
              <input
                className={checkoutInputClassName(Boolean(errors.city))}
                id="city"
                name="city"
                type="text"
                autoComplete="address-level2"
                placeholder="e.g. Ibadan"
                value={form.city}
                onChange={(event) => onChange('city', event.target.value)}
                aria-invalid={Boolean(errors.city)}
                aria-describedby={errors.city ? 'city-error' : undefined}
                required
              />
              <CheckoutFieldError id="city" message={errors.city} />
            </div>

            <div>
              <label className="text-sm font-bold text-green-dark" htmlFor="deliveryInstructions">
                Delivery instructions <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                className={`${checkoutInputClassName(false)} min-h-24 resize-y`}
                id="deliveryInstructions"
                name="deliveryInstructions"
                placeholder="Landmark, preferred delivery time, or other helpful details"
                value={form.deliveryInstructions}
                onChange={(event) => onChange('deliveryInstructions', event.target.value)}
              />
            </div>
          </div>
        )}
      </fieldset>
    </section>
  )
}