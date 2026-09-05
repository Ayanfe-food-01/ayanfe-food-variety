import type { PaymentSettings } from '../../services/storeSettingsService'
import type { PaymentMethod } from '../../services/orderService'
import {
  checkoutDescriptionClassName,
  checkoutFieldsetClassName,
  checkoutLegendClassName,
  checkoutSectionClassName,
} from './checkoutStyles'

interface PaymentStepProps {
  methods: PaymentSettings[]
  selectedMethod: PaymentMethod
  selectedSettings: PaymentSettings | null
  isLoading: boolean
  error: string | null
  onChange: (method: PaymentMethod) => void
}

export function PaymentStep({
  methods,
  selectedMethod,
  selectedSettings,
  isLoading,
  error,
  onChange,
}: PaymentStepProps) {
  return (
    <section className={checkoutSectionClassName}>
      <fieldset className={checkoutFieldsetClassName}>
        <legend className={checkoutLegendClassName}>Payment method</legend>
        <p className={checkoutDescriptionClassName}>
          Choose how you will pay. Your payment will remain pending until the store confirms it.
        </p>

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