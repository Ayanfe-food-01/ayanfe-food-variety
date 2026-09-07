import type { CSSProperties, ReactNode } from 'react'

interface PopoverProps {
  isOpen: boolean
  onClose: () => void
  className?: string
  style?: CSSProperties
  maxHeight?: string
  surface?: 'cream' | 'white'
  role?: string
  ariaLabel?: string
  children: (close: () => void) => ReactNode
}

export function Popover({
  isOpen,
  onClose,
  className = '',
  style,
  maxHeight,
  surface = 'cream',
  role,
  ariaLabel,
  children,
}: PopoverProps) {
  if (!isOpen) return null

  return (
    <div
      className={`popover-panel ${className}`.trim()}
      role={role}
      aria-label={ariaLabel}
      style={{
        ...(surface === 'white' ? { background: '#fff' } : {}),
        ...style,
        ...(maxHeight ? { maxHeight } : {}),
      }}
    >
      {children(onClose)}
    </div>
  )
}