import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'

export interface NavigationItem {
  label: string
  href: string
}

interface NavigationLinksProps {
  items: NavigationItem[]
  className: string
  onNavigate?: () => void
}

/**
 * Shared link renderer for the storefront navigation.
 *
 * Keeping route links and in-page anchors behind one component means mobile
 * and desktop menus stay in sync as navigation items are added or changed.
 */
export function NavigationLinks({ items, className, onNavigate }: NavigationLinksProps) {
  return (
    <>
      {items.map((item) => {
        const linkProps = {
          className,
          onClick: onNavigate,
        }

        return item.href.startsWith('/') ? (
          <Link key={item.label} to={item.href} {...linkProps}>
            {item.label}
          </Link>
        ) : (
          <a key={item.label} href={item.href} {...linkProps}>
            {item.label}
          </a>
        )
      })}
    </>
  )
}

export function NavigationMenu({
  children,
  isOpen,
  onClose,
}: {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
}) {
  const menu = (
    <>
      <button
        className={`sidebar-backdrop fixed inset-0 z-50 bg-green-dark/25 backdrop-blur-[2px] md:hidden ${
          isOpen ? 'sidebar-backdrop-open pointer-events-auto opacity-100' : 'sidebar-backdrop-closed pointer-events-none opacity-0'
        }`}
        type="button"
        aria-label="Close navigation menu"
        tabIndex={isOpen ? 0 : -1}
        onClick={onClose}
      />
      <div
        className={`sidebar-drawer fixed inset-0 z-[60] flex h-dvh min-h-full w-screen max-w-none flex-col overflow-y-auto border-r border-line bg-cream p-6 text-sm font-medium text-muted shadow-[18px_0_50px_rgba(32,60,36,0.16)] ${
          isOpen ? 'sidebar-drawer-open' : 'sidebar-drawer-closed'
        } md:!visible md:static md:h-auto md:min-h-0 md:inset-auto md:z-auto md:flex md:w-auto md:min-w-0 md:flex-1 md:translate-x-0 md:flex-row md:items-center md:justify-center md:gap-8 md:overflow-visible md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
      >
        {children}
      </div>
    </>
  )

  // The sticky header uses backdrop-filter, which creates a containing block
  // for fixed descendants. Portal the open mobile menu to body so inset-0
  // always means the actual viewport, not the header's 78px height.
  return isOpen && typeof document !== 'undefined'
    ? createPortal(menu, document.body)
    : menu
}