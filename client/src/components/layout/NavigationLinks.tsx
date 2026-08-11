import type { ReactNode } from 'react'
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
}: {
  children: ReactNode
  isOpen: boolean
}) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 top-[88px] z-40 w-screen ${
        isOpen ? 'flex' : 'hidden'
      } flex-col items-stretch gap-0 overflow-y-auto border-y border-line bg-cream p-4 text-sm font-medium text-muted shadow-[0_18px_40px_rgba(32,60,36,0.12)] md:static md:inset-auto md:z-auto md:flex md:w-auto md:overflow-visible md:flex-row md:items-center md:gap-8 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
    >
      {children}
    </div>
  )
}