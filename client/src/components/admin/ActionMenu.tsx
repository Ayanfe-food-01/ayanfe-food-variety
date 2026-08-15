import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontalIcon } from '../../assets/icons'

interface ActionMenuProps {
  ariaLabel: string
  isBusy?: boolean
  fixedPosition?: boolean
  triggerVariant?: 'default' | 'plain'
  triggerOrientation?: 'horizontal' | 'vertical'
  children: (close: () => void) => ReactNode
}

interface MenuLayout {
  placement: 'top' | 'bottom'
  top: number
  left: number
  maxHeight: number
}

export function ActionMenu({
  ariaLabel,
  isBusy = false,
  fixedPosition = false,
  triggerVariant = 'default',
  triggerOrientation = 'horizontal',
  children,
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuLayout, setMenuLayout] = useState<MenuLayout | null>(null)
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

  useLayoutEffect(() => {
    if (!isOpen || !fixedPosition) return

    const positionMenu = () => {
      const button = buttonRef.current
      const menu = menuRef.current
      if (!button || !menu) return

      const buttonRect = button.getBoundingClientRect()
      const menuRect = menu.getBoundingClientRect()
      const gap = 8
      const viewportPadding = 12
      const availableBelow = Math.max(0, window.innerHeight - buttonRect.bottom - viewportPadding)
      const availableAbove = Math.max(0, buttonRect.top - viewportPadding)
      const opensAbove = availableBelow < menuRect.height + gap && availableAbove > availableBelow
      const availableSpace = opensAbove ? availableAbove : availableBelow
      const maxHeight = Math.max(0, Math.min(window.innerHeight - viewportPadding * 2, availableSpace - gap))
      const menuHeight = Math.min(menuRect.height, maxHeight || menuRect.height)
      const top = opensAbove
        ? buttonRect.top - menuHeight - gap
        : buttonRect.bottom + gap
      const clampedTop = Math.min(
        Math.max(viewportPadding, top),
        Math.max(viewportPadding, window.innerHeight - viewportPadding - menuHeight),
      )
      const desiredLeft = buttonRect.right - menuRect.width
      const left = Math.min(
        Math.max(viewportPadding, desiredLeft),
        Math.max(viewportPadding, window.innerWidth - viewportPadding - menuRect.width),
      )
      setMenuLayout((current) => (
        current?.placement === (opensAbove ? 'top' : 'bottom')
        && current.top === clampedTop
        && current.left === left
        && current.maxHeight === maxHeight
          ? current
          : { placement: opensAbove ? 'top' : 'bottom', top: clampedTop, left, maxHeight }
      ))
    }

    positionMenu()
    const menuResizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(positionMenu)
    if (menuResizeObserver && menuRef.current) menuResizeObserver.observe(menuRef.current)
    window.addEventListener('resize', positionMenu)
    window.addEventListener('scroll', positionMenu, true)
    return () => {
      menuResizeObserver?.disconnect()
      window.removeEventListener('resize', positionMenu)
      window.removeEventListener('scroll', positionMenu, true)
    }
  }, [fixedPosition, isOpen])

  useLayoutEffect(() => {
    if (!isOpen || fixedPosition) return

    const positionMenu = () => {
      const button = buttonRef.current
      const menu = menuRef.current
      if (!button || !menu) return

      const buttonRect = button.getBoundingClientRect()
      const menuRect = menu.getBoundingClientRect()
      const gap = 8
      const viewportPadding = 12
      const availableBelow = Math.max(0, window.innerHeight - buttonRect.bottom - viewportPadding)
      const availableAbove = Math.max(0, buttonRect.top - viewportPadding)
      const opensAbove = availableBelow < menuRect.height + gap && availableAbove > availableBelow
      const availableSpace = opensAbove ? availableAbove : availableBelow
      const maxHeight = Math.max(0, Math.min(window.innerHeight - viewportPadding * 2, availableSpace - gap))
      setMenuLayout((current) => (
        current?.placement === (opensAbove ? 'top' : 'bottom') && current.maxHeight === maxHeight
          ? current
          : { placement: opensAbove ? 'top' : 'bottom', top: 0, left: 0, maxHeight }
      ))
    }

    positionMenu()
    const menuResizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(positionMenu)
    if (menuResizeObserver && menuRef.current) menuResizeObserver.observe(menuRef.current)
    window.addEventListener('resize', positionMenu)
    window.addEventListener('scroll', positionMenu, true)
    return () => {
      menuResizeObserver?.disconnect()
      window.removeEventListener('resize', positionMenu)
      window.removeEventListener('scroll', positionMenu, true)
    }
  }, [fixedPosition, isOpen])

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        className={triggerVariant === 'plain'
          ? 'grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-transparent hover:text-green-dark disabled:cursor-wait disabled:opacity-50'
          : 'grid size-9 place-items-center rounded-full border border-line bg-white text-muted transition-colors hover:border-green/30 hover:bg-sage/40 hover:text-green-dark disabled:cursor-wait disabled:opacity-50'}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        disabled={isBusy}
        ref={buttonRef}
        onClick={() => {
          setMenuLayout(null)
          setIsOpen((current) => !current)
        }}
      >
        <span className={triggerOrientation === 'vertical' ? 'rotate-90' : undefined}>
          <MoreHorizontalIcon size={20} />
        </span>
      </button>
      {isOpen && (
        <div
          className={`${fixedPosition ? 'fixed' : `absolute right-0 ${menuLayout?.placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`} z-50 min-w-44 overflow-y-auto overflow-x-hidden rounded-xl border border-line bg-white p-1.5 text-left shadow-xl shadow-green-dark/10`}
          role="menu"
          ref={menuRef}
          style={{
            ...(fixedPosition && menuLayout ? {
              top: menuLayout.top,
              left: menuLayout.left,
            } : {}),
            maxHeight: menuLayout?.maxHeight || 'calc(100vh - 24px)',
            visibility: menuLayout ? 'visible' : 'hidden',
          }}
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