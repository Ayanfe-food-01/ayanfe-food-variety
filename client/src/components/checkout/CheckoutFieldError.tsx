import type { CheckoutField } from './types'

interface CheckoutFieldErrorProps {
  id: CheckoutField
  message?: string
}

export function CheckoutFieldError({ id, message }: CheckoutFieldErrorProps) {
  return message ? (
    <p className="mt-1.5 text-xs font-medium text-orange" id={`${id}-error`} role="alert">
      {message}
    </p>
  ) : null
}