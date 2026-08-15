import type { PaymentSettings } from '../../services/storeSettingsService'
import type { FulfillmentMethod, PaymentMethod } from '../../services/orderService'
import type { CheckoutField, CheckoutFormData, CheckoutFormErrors } from './types'
import { checkoutInputClassName } from './checkoutStyles'

interface FieldErrorProps {
  id: CheckoutField
  message?: string
}

interface FieldSectionProps {
  form: CheckoutFormData
  errors: CheckoutFormErrors
  onChange: (field: CheckoutField, value: string) => void
}

interface PaymentMethodSectionProps {
  methods: PaymentSettings[]
  selectedMethod: PaymentMethod
  selectedSettings: PaymentSettings | null
  isLoading: boolean
  error: string | null
  onChange: (method: PaymentMethod) => void
}

interface FulfillmentSectionProps extends FieldSectionProps {
  fulfillmentMethod: FulfillmentMethod | ''
}

const fulfillmentOptions = [
  ['PICKUP', 'Pickup', 'Collect your order from the store. No delivery fee.'],
  ['DELIVERY', 'Delivery', 'Have your order brought to your delivery address.'],
] as const

export function CheckoutFieldError({ id, message }: FieldErrorProps) {
  return message ? (
    <p className="mt-1.5 text-xs font-medium text-orange" id={`${id}-error`} role="alert">
      {message}
    </p>
  ) : null
}

export function ContactDetailsSection({ form, errors, onChange }: FieldSectionProps) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="text-2xl font-bold tracking-[-0.03em] text-green-dark">Contact details</legend>
      <p className="mt-2 text-sm leading-6 text-muted">
        We’ll use these details to confirm your order and contact you when it is ready.
      </p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-bold text-green-dark" htmlFor="fullName">
            Full name <span className="text-orange" aria-hidden="true">*</span>
          </label>
          <input
            className={checkoutInputClassName(Boolean(errors.fullName))}
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            value={form.fullName}
            onChange={(event) => onChange('fullName', event.target.value)}
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? 'fullName-error' : undefined}
            required
          />
          <CheckoutFieldError id="fullName" message={errors.fullName} />
        </div>

        <div>
          <label className="text-sm font-bold text-green-dark" htmlFor="phone">
            Phone number <span className="text-orange" aria-hidden="true">*</span>
          </label>
          <input
            className={checkoutInputClassName(Boolean(errors.phone))}
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(event) => onChange('phone', event.target.value)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            required
          />
          <CheckoutFieldError id="phone" message={errors.phone} />
        </div>

        <div>
          <label className="text-sm font-bold text-green-dark" htmlFor="email">Account email</label>
          <input
            className={checkoutInputClassName(false)}
            id="email"
            name="email"
            type="email"
            readOnly
            value={form.email}
            aria-describedby="email-help"
          />
          <p className="mt-1.5 text-xs text-muted" id="email-help">This is the email on your customer account.</p>
        </div>
      </div>
    </fieldset>
  )
}

export function PaymentMethodSection({
  methods,
  selectedMethod,
  selectedSettings,
  isLoading,
  error,
  onChange,
}: PaymentMethodSectionProps) {
  return (
    <fieldset className="m-0 border-0 border-t border-line p-0 pt-8">
      <legend className="text-2xl font-bold tracking-[-0.03em] text-green-dark">Payment method</legend>
      <p className="mt-2 text-sm leading-6 text-muted">
        Choose how you will pay. Your payment will remain pending until the store confirms it.
      </p>

      {isLoading ? (
        <div className="mt-5 rounded-2xl border border-line bg-cream/60 p-4 text-sm text-muted">
          Loading available payment methods…
        </div>
      ) : error ? (
        <div className="mt-5 rounded-2xl border border-orange/30 bg-orange/5 p-4 text-sm leading-6 text-orange" role="alert">
          {error}
        </div>
      ) : methods.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-orange/30 bg-orange/5 p-4 text-sm leading-6 text-orange" role="alert">
          No payment methods are currently available. Please contact the store.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {methods.map((method) => (
            <label
              className={`block cursor-pointer rounded-2xl border p-4 transition-colors ${
                selectedMethod === method.paymentMethod
                  ? 'border-green bg-sage/30'
                  : 'border-line bg-white hover:border-green/40'
              }`}
              key={method.paymentMethod}
            >
              <span className="flex items-start gap-3">
                <input
                  className="mt-1 size-4 accent-green"
                  type="radio"
                  name="paymentMethod"
                  value={method.paymentMethod}
                  checked={selectedMethod === method.paymentMethod}
                  onChange={() => onChange(method.paymentMethod)}
                />
                <span>
                  <span className="block text-sm font-bold text-green-dark">
                    {method.paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' : method.paymentMethod}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    Transfer the order total using the account details below.
                  </span>
                </span>
              </span>
            </label>
          ))}
        </div>
      )}

      {selectedSettings?.paymentMethod === 'BANK_TRANSFER' && (
        <div className="mt-4 rounded-2xl border border-green/20 bg-sage/20 p-4">
          <p className="text-sm font-bold text-green-dark">Bank transfer instructions</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Bank</dt>
              <dd className="text-right font-bold text-green-dark">{selectedSettings.bankName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Account name</dt>
              <dd className="text-right font-bold text-green-dark">{selectedSettings.accountName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Account number</dt>
              <dd className="text-right font-bold text-green-dark">{selectedSettings.accountNumber}</dd>
            </div>
          </dl>
          <p className="mt-3 whitespace-pre-line text-xs leading-5 text-muted">{selectedSettings.instructions}</p>
        </div>
      )}
    </fieldset>
  )
}

export function FulfillmentSection({ form, errors, fulfillmentMethod, onChange }: FulfillmentSectionProps) {
  const isDelivery = fulfillmentMethod === 'DELIVERY'

  return (
    <fieldset className="m-0 border-0 border-t border-line p-0 pt-8">
      <legend className="mt-4 block text-2xl font-bold tracking-[-0.03em] text-green-dark">Delivery option</legend>
      <p className="mt-2 text-sm leading-6 text-muted">
        Choose pickup or delivery. This selection is saved with your order and cannot change after it is placed.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {fulfillmentOptions.map(([value, label, description]) => (
          <label
            className={`block cursor-pointer rounded-2xl border p-4 transition-colors ${
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
        <div className="mt-7 grid gap-5">
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
  )
}