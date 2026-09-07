import type { Ref } from 'react'
import { MoreHorizontalIcon } from '../../assets/icons'

interface MoreActionsButtonProps {
  label: string
  onClick: () => void
  isOpen?: boolean
  isDisabled?: boolean
  variant?: 'default' | 'plain'
  orientation?: 'horizontal' | 'vertical'
  ref?: Ref<HTMLButtonElement>
}

export function MoreActionsButton({
  label,
  onClick,
  isOpen = false,
  isDisabled = false,
  variant = 'default',
  orientation = 'horizontal',
  ref,
}: MoreActionsButtonProps) {
  return (
    <button
      ref={ref}
      className={variant === 'plain'
        ? 'grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-transparent hover:text-green-dark disabled:cursor-wait disabled:opacity-50'
        : 'grid size-9 place-items-center rounded-full border border-line bg-white text-muted transition-colors hover:border-green/30 hover:bg-sage/40 hover:text-green-dark disabled:cursor-wait disabled:opacity-50'}
      type="button"
      aria-label={label}
      aria-expanded={isOpen}
      aria-haspopup="menu"
      disabled={isDisabled}
      onClick={onClick}
    >
      <span className={orientation === 'vertical' ? 'rotate-90' : undefined}>
        <MoreHorizontalIcon size={20} />
      </span>
    </button>
  )
}