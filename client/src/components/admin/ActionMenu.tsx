import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontalIcon } from '../../assets/icons'

interface ActionMenuProps {
  ariaLabel: string
  isBusy?: boolean
  fixedPosition?: boolean
  children: (close: () => void) => ReactNode
}

export function ActionMenu({ ariaLabel, isBusy = false, fixedPosition = false, children }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !fixedPosition) return

    const positionMenu = () => {
      const button = buttonRef.current
      const menu = menuRef.current
      if (!button || !menu) return

      const buttonRect = button.getBoundingClientRect()
      const menuRect = menu.getBoundingClientRect()
      const gap = 8
      const hasRoomBelow = window.innerHeight - buttonRect.bottom >= menuRect.height + gap
      const top = hasRoomBelow
        ? buttonRect.bottom + gap
        : Math.max(gap, buttonRect.top - menuRect.height - gap)
      const right = Math.max(gap, window.innerWidth - buttonRect.right)
      setMenuPosition((current) => current?.top === top && current.right === right ? current : { top, right })
    }

    positionMenu()
    window.addEventListener('resize', positionMenu)
    window.addEventListener('scroll', positionMenu, true)
    return () => {
      window.removeEventListener('resize', positionMenu)
      window.removeEventListener('scroll', positionMenu, true)
    }
  }, [fixedPosition, isOpen])

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        className="grid size-9 place-items-center rounded-full border border-line bg-white text-muted transition-colors hover:border-green/30 hover:bg-sage/40 hover:text-green-dark disabled:cursor-wait disabled:opacity-50"
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        disabled={isBusy}
        ref={buttonRef}
        onClick={() => setIsOpen((current) => !current)}
      >
        <MoreHorizontalIcon size={20} />
      </button>
      {isOpen && (
        <div
          className={`${fixedPosition ? 'fixed' : 'absolute right-0 top-11'} z-50 max-h-[calc(100vh-16px)] min-w-44 overflow-y-auto overflow-x-hidden rounded-xl border border-line bg-white p-1.5 text-left shadow-xl shadow-green-dark/10`}
          role="menu"
          ref={menuRef}
          style={fixedPosition ? {
            top: menuPosition?.top ?? 0,
            right: menuPosition?.right ?? 8,
            visibility: menuPosition ? 'visible' : 'hidden',
          } : undefined}
        >
          {children(() => setIsOpen(false))}
        </div>
      )}
    </div>
  )
}

interface ActionMenuItemProps {
  children: ReactNode
  onClick: () => void
  tone?: 'default' | 'accent' | 'danger'
}

const actionMenuItemClasses = {
  default: 'text-green-dark hover:bg-sage/50',
  accent: 'text-orange hover:bg-orange/10',
  danger: 'text-muted hover:bg-orange/10 hover:text-orange',
}

export function ActionMenuButton({ children, onClick, tone = 'default' }: ActionMenuItemProps) {
  return (
    <button
      className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${actionMenuItemClasses[tone]}`}
      type="button"
      role="menuitem"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

interface ActionMenuLinkProps {
  children: ReactNode
  to: string
  onClick: () => void
}

export function ActionMenuLink({ children, to, onClick }: ActionMenuLinkProps) {
  return (
    <Link
      className={`block rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${actionMenuItemClasses.default}`}
      role="menuitem"
      to={to}
      onClick={onClick}
    >
      {children}
    </Link>
  )
}