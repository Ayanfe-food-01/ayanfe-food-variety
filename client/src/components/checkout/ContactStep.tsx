import type { CheckoutField, CheckoutFormData, CheckoutFormErrors } from './types'
import { PhoneInputField } from '../ui/PhoneInput'
import { CheckoutFieldError } from './CheckoutFieldError'
import {
  checkoutDescriptionClassName,
  checkoutFieldGridClassName,
  checkoutFieldsetClassName,
  checkoutInputClassName,
  checkoutLegendClassName,
} from './checkoutStyles'

interface ContactStepProps {
  form: CheckoutFormData
  errors: CheckoutFormErrors
  isAuthenticated: boolean
  onChange: (field: CheckoutField, value: string) => void
}

export function ContactStep({ form, errors, isAuthenticated, onChange }: ContactStepProps) {
  return (
    <fieldset className={checkoutFieldsetClassName}>
      <legend className={checkoutLegendClassName}>Contact details</legend>
      <p className={checkoutDescriptionClassName}>
        We’ll use these details to confirm your order and contact you when it is ready.
      </p>

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
            {isAuthenticated
              ? 'This is the email on your customer account.'
              : 'We’ll use this email to confirm your guest order.'}
          </p>
        </div>
      </div>
    </fieldset>
  )
}