import type { ReactNode } from 'react'

interface FieldProps {
  className?: string
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  errorId?: string
  children: ReactNode
}

export function Field({ className = '', label, htmlFor, hint, error, errorId, children }: FieldProps) {
  return (
    <div className={className}>
      <label className="text-sm font-bold text-green-dark" htmlFor={htmlFor}>{label}</label>
      {children}
      {error && (
        <span className="mt-1 block text-xs font-normal text-orange" id={errorId}>{error}</span>
      )}
      {hint && <span className="mt-1 block text-xs font-normal text-muted">{hint}</span>}
    </div>
  )
}

export const adminControlClass =
  'mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green'