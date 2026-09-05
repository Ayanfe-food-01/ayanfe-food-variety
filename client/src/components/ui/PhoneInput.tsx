import { forwardRef, useId } from 'react'
import PhoneInput from 'react-phone-number-input'
import getUnicodeFlagIcon from 'country-flag-icons/unicode'
import { SelectField } from './SelectField'

interface PhoneCountryOption {
  value?: string
  label: string
  divider?: boolean
}

interface PhoneCountrySelectProps {
  value?: string
  onChange?: (value?: string) => void
  options?: PhoneCountryOption[]
  disabled?: boolean
  readOnly?: boolean
}

function PhoneCountrySelect({
  value,
  onChange,
  options = [],
  disabled,
  readOnly,
}: PhoneCountrySelectProps) {
  const countryOptions = options
    .filter((option) => !option.divider)
    .map((option) => {
      const code = option.value ?? ''
      const isInternational = !code || code === 'ZZ'
      return {
        value: isInternational ? 'ZZ' : code,
        label: isInternational
          ? option.label
          : `${getUnicodeFlagIcon(code)} ${option.label}`,
      }
    })
  const selectedValue = value && value !== 'ZZ' ? value : ''
  const hasSelectedCountry = Boolean(selectedValue)

  return (
    <SelectField
      ariaLabel="Country code"
      className="phone-country-select"
      variant="compact"
      placeholder="Country"
      value={hasSelectedCountry ? selectedValue : ''}
      buttonLabel={hasSelectedCountry ? getUnicodeFlagIcon(selectedValue) : undefined}
      options={countryOptions}
      disabled={disabled || readOnly}
      onChange={(next) => onChange?.(next === 'ZZ' ? undefined : next)}
    />
  )
}

interface PhoneInputFieldProps {
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  'aria-describedby'?: string
  hasError?: boolean
  className?: string
}

const PhoneNumberInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...rest }, ref) => (
  <input
    ref={ref}
    {...rest}
    className={`${className ?? ''} h-auto min-w-0 flex-1 rounded-r-xl border-0 bg-transparent py-3 pl-1 pr-4 text-sm text-ink outline-none placeholder:text-muted/60`}
  />
))
PhoneNumberInput.displayName = 'PhoneNumberInput'

export function PhoneInputField({
  id,
  name,
  value,
  onChange,
  placeholder = '801 234 5678',
  autoComplete = 'tel',
  'aria-describedby': ariaDescribedBy,
  hasError = false,
  className,
}: PhoneInputFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <PhoneInput
      id={inputId}
      name={name}
      defaultCountry="NG"
      international
      smartCaret
      value={value}
      onChange={(next) => onChange(next ?? '')}
      placeholder={placeholder}
      autoComplete={autoComplete}
      aria-invalid={hasError || undefined}
      aria-describedby={ariaDescribedBy}
      inputComponent={PhoneNumberInput}
      countrySelectComponent={PhoneCountrySelect}
      className={`phone-input-root flex items-stretch overflow-hidden rounded-xl bg-white transition-colors focus-within:ring-2 ${
        hasError
          ? 'border border-orange focus-within:border-orange focus-within:ring-orange/10'
          : 'border border-line focus-within:border-green focus-within:ring-green/10'
      } ${className ?? ''}`}
    />
  )
}
