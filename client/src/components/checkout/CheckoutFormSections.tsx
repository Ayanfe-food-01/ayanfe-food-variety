import type { PaymentSettings } from '../../services/storeSettingsService'
import type { PaymentMethod } from '../../services/orderService'
import type { CheckoutField, CheckoutFormData, CheckoutFormErrors } from './types'
import { PhoneInputField } from '../ui/PhoneInput'
import {
  checkoutDescriptionClassName,
  checkoutFieldGridClassName,
  checkoutFieldsetClassName,
  checkoutInputClassName,
  checkoutLegendClassName,
  checkoutSectionClassName,
} from './checkoutStyles'

interface FieldErrorProps {
  id: CheckoutField
  message?: string
}

interface FieldSectionProps {
  form: CheckoutFormData
  errors: CheckoutFormErrors
  isAuthenticated: boolean
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

function CheckoutSectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <>
      <legend className={checkoutLegendClassName}>{title}</legend>
      <p className={checkoutDescriptionClassName}>{description}</p>
    </>
  )
}

export function CheckoutFieldError({ id, message }: FieldErrorProps) {
  return message ? (
    <p className="mt-1.5 text-xs font-medium text-orange" id={`${id}-error`} role="alert">
      {message}
    </p>
  ) : null
}

export function ContactDetailsSection({ form, errors, isAuthenticated, onChange }: FieldSectionProps) {
  return (
    <fieldset className={checkoutFieldsetClassName}>
      <CheckoutSectionHeader
        title="Contact details"
        description="We’ll use these details to confirm your order and contact you when it is ready."
      />

      <div className={checkoutFieldGridClassName}>
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
          <PhoneInputField
            className="mt-2"
            id="phone"
            name="phone"
            value={form.phone}
            hasError={Boolean(errors.phone)}
            onChange={(value) => onChange('phone', value)}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
          />
          <CheckoutFieldError id="phone" message={errors.phone} />
        </div>

        <div>
          <label className="text-sm font-bold text-green-dark" htmlFor="email">
            Email address <span className="text-orange" aria-hidden="true">*</span>
          </label>
          <input
            className={checkoutInputClassName(Boolean(errors.email))}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            readOnly={isAuthenticated}
            value={form.email}
            onChange={(event) => onChange('email', event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : 'email-help'}
            required
          />
          <CheckoutFieldError id="email" message={errors.email} />
          <p className="mt-2 text-xs text-muted" id="email-help">
            {isAuthenticated ? 'This is the email on your customer account.' : 'We’ll use this email to confirm your guest order.'}
          </p>
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
    <section className={checkoutSectionClassName}>
      <fieldset className={checkoutFieldsetClassName}>
        <CheckoutSectionHeader
          title="Payment method"
          description="Choose how you will pay. Your payment will remain pending until the store confirms it."
        />

        {isLoading ? (
          <div className="mt-6 rounded-2xl border border-line bg-cream/60 p-5 text-sm text-muted">
            Loading available payment methods…
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-orange/30 bg-orange/5 p-5 text-sm leading-6 text-orange" role="alert">
            {error}
          </div>
        ) : methods.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-orange/30 bg-orange/5 p-5 text-sm leading-6 text-orange" role="alert">
            No payment methods are currently available. Please contact the store.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {methods.map((method) => (
              <label
                className={`block cursor-pointer rounded-2xl border p-5 transition-colors ${
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
                      {method.paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' : method.paymentMethod === 'PAYSTACK' ? 'Paystack' : method.paymentMethod}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted">
                      {method.paymentMethod === 'BANK_TRANSFER'
                        ? 'Transfer the order total using the account details below.'
                        : 'Pay online securely with Paystack using card, bank, USSD, or QR.'}
                    </span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        {selectedSettings?.paymentMethod === 'BANK_TRANSFER' && (
          <div className="mt-5 rounded-2xl border border-green/20 bg-sage/20 p-5">
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
        {selectedSettings?.paymentMethod === 'PAYSTACK' && (
          <div className="mt-5 rounded-2xl border border-green/20 bg-sage/20 p-5">
            <p className="text-sm font-bold text-green-dark">Paystack payment</p>
            <p className="mt-3 text-xs leading-5 text-muted">
              After placing your order you will be redirected to Paystack to complete the payment securely. Your order
              stays pending until the payment is confirmed by the store.
            </p>
          </div>
        )}
      </fieldset>
    </section>
  )
}
