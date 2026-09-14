import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

interface ContactFormFieldProps {
  label: string
  htmlFor: string
  error?: string
  required?: boolean
  className?: string
  children: ReactNode
}

function FieldShell({ label, htmlFor, error, required, children }: ContactFormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-bold text-green-dark" htmlFor={htmlFor}>
        {label} {required && <span className="text-orange">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-2 text-xs font-semibold text-orange" role="alert" id={`${htmlFor}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}

interface ContactInputProps extends InputHTMLAttributes<HTMLInputElement> {
  name: string
  label: string
  error?: string
}

export function ContactField({ name, label, error, required, className, ...rest }: ContactInputProps) {
  return (
    <FieldShell label={label} htmlFor={name} error={error} required={required}>
      <input
        {...rest}
        id={name}
        className={`mt-2 w-full rounded-xl border bg-cream px-4 py-3 text-sm font-normal outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/10 ${
          error ? 'border-orange/40' : 'border-line'
        } ${className ?? ''}`}
      />
    </FieldShell>
  )
}

interface ContactTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string
  label: string
  error?: string
  rows?: number
}

export function ContactTextarea({ name, label, error, required, className, rows = 5, ...rest }: ContactTextareaProps) {
  return (
    <FieldShell label={label} htmlFor={name} error={error} required={required}>
      <textarea
        {...rest}
        id={name}
        rows={rows}
        className={`mt-2 w-full resize-y rounded-xl border bg-cream px-4 py-3 text-sm font-normal outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/10 ${
          error ? 'border-orange/40' : 'border-line'
        } ${className ?? ''}`}
      />
    </FieldShell>
  )
}