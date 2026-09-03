import { forwardRef, useId } from 'react'
import PhoneInput from 'react-phone-number-input'

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
  React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }
>(({ hasError, className, ...rest }, ref) => (
  <input
    ref={ref}
    {...rest}
    className={`${className ?? ''} h-auto flex-1 rounded-r-xl border-0 bg-transparent px-0 py-0 text-sm text-ink outline-none placeholder:text-muted/60 ${
      hasError ? 'border-orange' : 'border-line'
    }`}
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
      className={`phone-input-root flex items-stretch overflow-hidden rounded-xl bg-white transition-colors focus-within:ring-2 ${
        hasError
          ? 'border border-orange focus-within:border-orange focus-within:ring-orange/10'
          : 'border border-line focus-within:border-green focus-within:ring-green/10'
      } ${className ?? ''}`}
    />
  )
}
