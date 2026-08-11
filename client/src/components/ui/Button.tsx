import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'outline' | 'text'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-green text-cream hover:bg-green-dark',
  outline: 'border border-green/20 bg-transparent text-green hover:bg-green hover:text-cream',
  text: 'text-green hover:text-orange',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-5 py-3 text-sm',
  lg: 'px-5 py-3.5 text-sm',
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}