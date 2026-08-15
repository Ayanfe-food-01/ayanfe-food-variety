import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  busy: boolean
  busyLabel: string
}

export function SubmitButton({ children, busy, busyLabel, className = '', disabled, ...props }: SubmitButtonProps) {
  return (
    <button
      {...props}
      className={`rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      type="submit"
      disabled={busy || disabled}
    >
      {busy ? busyLabel : children}
    </button>
  )
}