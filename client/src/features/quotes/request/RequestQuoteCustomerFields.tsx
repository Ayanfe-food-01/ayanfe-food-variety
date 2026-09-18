import { PhoneInputField } from '../../../components/ui/PhoneInput'
import type { FieldErrors } from './lib'

interface RequestQuoteCustomerFieldsProps {
  customerName: string
  customerEmail: string
  customerPhone: string
  message: string
  errors: FieldErrors
  isLoggedInCustomer: boolean
  onCustomerNameChange: (value: string) => void
  onCustomerEmailChange: (value: string) => void
  onCustomerPhoneChange: (value: string) => void
  onMessageChange: (value: string) => void
}

export function RequestQuoteCustomerFields({
  customerName,
  customerEmail,
  customerPhone,
  message,
  errors,
  isLoggedInCustomer,
  onCustomerNameChange,
  onCustomerEmailChange,
  onCustomerPhoneChange,
  onMessageChange,
}: RequestQuoteCustomerFieldsProps) {
  return (
    <section className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-8" aria-labelledby="customer-details-heading">
      <h2 id="customer-details-heading" className="text-xl font-bold text-green-dark">Your details</h2>
      <p className="mt-1 text-sm text-muted">
        {isLoggedInCustomer
          ? 'We’ve filled in the details from your account. Feel free to update them.'
          : 'No account needed — we’ll use these details to get back to you.'}
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor="quote-name">
            Full name
          </label>
          <input
            autoComplete="name"
            className={`w-full rounded-xl border bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10 ${errors.name ? 'border-orange/40' : 'border-line'}`}
            id="quote-name"
            value={customerName}
            onChange={(event) => onCustomerNameChange(event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'quote-name-error' : undefined}
            maxLength={180}
          />
          {errors.name && <p className="mt-2 text-xs font-semibold text-orange" id="quote-name-error">{errors.name}</p>}
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor="quote-email">
            Email address
          </label>
          <input
            autoComplete="email"
            className={`w-full rounded-xl border bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10 ${errors.email ? 'border-orange/40' : 'border-line'}`}
            id="quote-email"
            type="email"
            value={customerEmail}
            onChange={(event) => onCustomerEmailChange(event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'quote-email-error' : undefined}
            maxLength={255}
          />
          {errors.email && <p className="mt-2 text-xs font-semibold text-orange" id="quote-email-error">{errors.email}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor="quote-phone">
            Phone number
          </label>
          <PhoneInputField
            id="quote-phone"
            name="phone"
            value={customerPhone}
            hasError={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'quote-phone-error' : undefined}
            onChange={onCustomerPhoneChange}
          />
          {errors.phone && <p className="mt-2 text-xs font-semibold text-orange" id="quote-phone-error">{errors.phone}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor="quote-message">
            Message / requirements <span className="font-normal normal-case tracking-normal text-muted">(optional)</span>
          </label>
          <textarea
            className={`w-full resize-y rounded-xl border bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10 ${errors.message ? 'border-orange/40' : 'border-line'}`}
            id="quote-message"
            rows={4}
            maxLength={2000}
            placeholder="Delivery timeframe, packaging, other requirements…"
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? 'quote-message-error' : undefined}
          />
          {errors.message && <p className="mt-2 text-xs font-semibold text-orange" id="quote-message-error">{errors.message}</p>}
        </div>
      </div>
    </section>
  )
}