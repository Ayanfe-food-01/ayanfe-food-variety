import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, NavLink } from 'react-router-dom'
import {
  ArrowRight,
  BellIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  CreditCardIcon,
  GlobeIcon,
  HeartIcon,
  LayersIcon,
  MailIcon,
  ShieldIcon,
  SparkIcon,
  TruckIcon,
  UserIcon,
} from '../../assets/icons'
import { createPortal } from 'react-dom'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { DEFAULT_LOGO_PATH } from '../../seo/config'

interface NavLinkItem {
  label: string
  to: string
  icon: ReactNode
  end?: boolean
}

interface NavGroup {
  label: string
  icon: ReactNode
  links: NavLinkItem[]
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

const dashboard: NavLinkItem = { label: 'Dashboard', to: '/admin', end: true, icon: <SparkIcon size={18} /> }

const navGroups: NavGroup[] = [
  {
    label: 'Sales',
    icon: <ClipboardListIcon size={18} />,
    links: [
      { label: 'Orders', to: '/admin/orders', icon: <ClipboardListIcon size={18} /> },
      { label: 'Quote Requests', to: '/admin/quote-requests', icon: <MailIcon size={18} /> },
      { label: 'Analytics', to: '/admin/analytics', icon: <SparkIcon size={18} /> },
      { label: 'Customers', to: '/admin/customers', icon: <UserIcon size={18} /> },
    ],
  },
  {
    label: 'Products',
    icon: <LayersIcon size={18} />,
    links: [
      { label: 'Products', to: '/admin/products', icon: <LayersIcon size={18} /> },
      { label: 'Categories', to: '/admin/categories', icon: <LayersIcon size={18} /> },
    ],
  },
  {
    label: 'Inventory',
    icon: <TruckIcon size={18} />,
    links: [{ label: 'Inventory', to: '/admin/inventory', icon: <TruckIcon size={18} /> }],
  },
  {
    label: 'Store',
    icon: <GlobeIcon size={18} />,
    links: [
      { label: 'Delivery Zones & Fees', to: '/admin/delivery-zones', icon: <TruckIcon size={18} /> },
      { label: 'Promotional Banners', to: '/admin/banners', icon: <SparkIcon size={18} /> },
      { label: 'Testimonials', to: '/admin/testimonials', icon: <HeartIcon size={18} /> },
      { label: 'Reviews', to: '/admin/reviews', icon: <CheckIcon size={18} /> },
    ],
  },
  {
    label: 'Finance',
    icon: <CreditCardIcon size={18} />,
    links: [{ label: 'Payments', to: '/admin/payments', icon: <CreditCardIcon size={18} /> }],
  },
  {
    label: 'Communication',
    icon: <MailIcon size={18} />,
    links: [{ label: 'Notifications', to: '/admin/notifications', icon: <BellIcon size={18} /> }],
  },
  {
    label: 'System',
    icon: <ShieldIcon size={18} />,
    links: [{ label: 'Settings', to: '/admin/settings', icon: <ShieldIcon size={18} /> }],
  },
]

const isActivePath = (link: NavLinkItem, pathname: string) =>
  link.end ? pathname === link.to || pathname === `${link.to}/` : pathname.startsWith(link.to)

const groupForPath = (pathname: string): string | undefined =>
  navGroups.find((group) => group.links.some((link) => isActivePath(link, pathname)))?.label

const activeNavClasses = 'bg-cream text-green-dark'
const inactiveNavClasses = 'text-cream/70 xl:hover:bg-cream/10 hover:text-cream'

export function Sidebar({ isOpen, onClose, onLogout, isCollapsed, onToggleCollapse }: SidebarProps) {
  const { settings } = useStoreSettings()
  const logoUrl = settings?.logoUrl || DEFAULT_LOGO_PATH
  const { pathname } = useLocation()
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(() => {
    const activeGroup = groupForPath(pathname)
    return new Set(activeGroup ? [activeGroup] : [])
  })
  const [flyout, setFlyout] = useState<{ label: string; left: number; top: number } | null>(null)
  const flyoutRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)

  const toggleGroup = useCallback((label: string) => {
    setOpenGroups((current) => {
      const next = new Set(current)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const activeGroup = groupForPath(pathname)
      if (activeGroup) {
        setOpenGroups((current) => (current.has(activeGroup) ? current : new Set([...current, activeGroup])))
      }
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [pathname])

  useEffect(() => {
    if (!isOpen || isCollapsed) return
    const timeoutId = window.setTimeout(() => {
      const activeGroup = groupForPath(pathname)
      if (activeGroup) {
        setOpenGroups((current) => (current.has(activeGroup) ? current : new Set([...current, activeGroup])))
      }
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [isOpen, pathname, isCollapsed])

  useEffect(() => {
    if (!flyout) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        flyoutRef.current &&
        !flyoutRef.current.contains(target) &&
        !railRef.current?.contains(target)
      ) {
        setFlyout(null)
      }
    }
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setFlyout(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [flyout])

  const openFlyout = (group: NavGroup, event: React.MouseEvent<HTMLButtonElement>) => {
    if (flyout?.label === group.label) {
      setFlyout(null)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const left = Math.min(rect.right + 8, window.innerWidth - 240)
    const top = Math.max(12, rect.top)
    setFlyout({ label: group.label, left, top })
  }

  const expandedLink = (link: NavLinkItem) => (
    <NavLink
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? activeNavClasses : inactiveNavClasses}`
      }
      end={link.end}
      key={link.to}
      to={link.to}
      onClick={onClose}
    >
      <span className="shrink-0">{link.icon}</span>
      <span className="min-w-0 flex-1 truncate">{link.label}</span>
    </NavLink>
  )

  const expandedGroup = (group: NavGroup) => {
    const isGroupActive = group.links.some((link) => isActivePath(link, pathname))
    const isGroupOpen = openGroups.has(group.label)
    return (
      <section key={group.label} aria-label={group.label}>
        <button
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-[0.16em] transition-colors ${
            isGroupActive ? 'text-cream' : 'text-cream/45 hover:text-cream/80'
          }`}
          aria-expanded={isGroupOpen}
          onClick={() => toggleGroup(group.label)}
          type="button"
        >
          <span className="shrink-0">{group.icon}</span>
          <span className="min-w-0 flex-1 truncate text-left">{group.label}</span>
          <ChevronDownIcon className={`shrink-0 transition-transform ${isGroupOpen ? 'rotate-180' : ''}`} size={16} aria-hidden="true" />
        </button>
        {isGroupOpen && (
          <div className="mt-1 space-y-1">
            {group.links.map(expandedLink)}
          </div>
        )}
      </section>
    )
  }

  const railIcon = (link: NavLinkItem) => (
    <NavLink
      aria-label={link.label}
      className={({ isActive }) =>
        `grid size-10 place-items-center rounded-xl transition-colors ${isActive ? 'bg-cream text-green-dark' : 'text-cream/70 xl:hover:bg-cream/10 hover:text-cream'}`
      }
      end={link.end}
      key={link.to}
      title={link.label}
      to={link.to}
      onClick={() => setFlyout(null)}
    >
      {link.icon}
    </NavLink>
  )

  return (
    <>
      {isOpen && (
        <button
          className="fixed inset-0 z-30 bg-green-dark/30 xl:hidden"
          type="button"
          aria-label="Close admin navigation"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh min-h-0 flex-col overflow-hidden border-r border-green-dark/10 bg-green-dark px-5 py-5 text-cream transition-transform duration-200 xl:transition-[width] ${
          isCollapsed ? 'w-72 xl:w-[84px] xl:px-3' : 'w-72'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}`}
      >
        <div className="shrink-0 px-2">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'xl:justify-center' : ''}`}>
            <img
              className={`h-20 w-20 rounded-xl bg-white object-contain p-1 transition-all ${isCollapsed ? 'xl:h-10 xl:w-10' : ''}`}
              src={logoUrl}
              alt="Ayanfe Food Variety logo"
            />
            <p className={`m-0 text-xs text-cream/55 ${isCollapsed ? 'xl:hidden' : ''}`}>Admin portal</p>
          </div>
        </div>

        <nav
          className="mt-8 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 y-scrollbar"
          aria-label="Admin navigation"
        >
          <div className={`space-y-6 ${isCollapsed ? 'xl:hidden' : ''}`}>
            <div className="space-y-1">
              {expandedLink(dashboard)}
            </div>
            {navGroups.map(expandedGroup)}
          </div>

          {isCollapsed && (
            <div className="hidden h-full flex-col items-center gap-2 xl:flex" ref={railRef}>
              {railIcon(dashboard)}
              {navGroups.map((group) => (
                <button
                  aria-expanded={flyout?.label === group.label}
                  aria-haspopup="menu"
                  aria-label={group.label}
                  className={`grid size-10 place-items-center rounded-xl transition-colors ${
                    group.links.some((link) => isActivePath(link, pathname))
                      ? 'bg-cream text-green-dark'
                      : 'text-cream/70 xl:hover:bg-cream/10 hover:text-cream'
                  }`}
                  key={group.label}
                  onClick={(event) => openFlyout(group, event)}
                  title={group.label}
                  type="button"
                >
                  {group.icon}
                </button>
              ))}
            </div>
          )}
        </nav>

        <div className="mt-4 shrink-0 border-t border-cream/10 pt-4">
          <div className={`mb-3 ${isCollapsed ? 'hidden xl:flex xl:justify-center' : 'hidden'}`}>
            <button
              aria-label="Expand sidebar"
              className="grid size-9 place-items-center rounded-full text-cream/55 transition-colors hover:bg-cream/10 hover:text-cream"
              onClick={onToggleCollapse}
              type="button"
            >
              <ChevronRightIcon size={16} aria-hidden="true" />
            </button>
          </div>
          <div className={`hidden items-center xl:flex ${isCollapsed ? 'xl:hidden' : ''}`}>
            <button
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-cream/45 transition-colors hover:text-cream/80"
              onClick={onToggleCollapse}
              type="button"
            >
              Collapse
              <ChevronLeftIcon size={16} aria-hidden="true" />
            </button>
          </div>
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cream px-4 py-3 text-sm font-bold text-green-dark transition-colors hover:bg-white"
            type="button"
            onClick={onLogout}
          >
            <span className={`${isCollapsed ? 'xl:hidden' : ''}`}>Logout</span>
            <span className={isCollapsed ? 'hidden xl:grid place-items-center' : 'hidden'}>
              <ArrowRight className="rotate-180" size={16} aria-hidden="true" />
            </span>
          </button>
        </div>
      </aside>

      {flyout && createPortal(
        <div
          className="fixed z-50 max-h-[70vh] w-56 overflow-y-auto overflow-x-hidden rounded-xl border border-line bg-cream p-2 shadow-xl shadow-green-dark/15"
          role="menu"
          ref={flyoutRef}
          style={{ left: flyout.left, top: flyout.top }}
        >
          <p className="px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-muted">{flyout.label}</p>
          <div className="space-y-1">
            {navGroups
              .find((group) => group.label === flyout.label)!
              .links.map((link) => (
                <NavLink
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? activeNavClasses : inactiveNavClasses}`
                  }
                  end={link.end}
                  key={link.to}
                  role="menuitem"
                  to={link.to}
                  onClick={() => setFlyout(null)}
                >
                  <span className="shrink-0">{link.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{link.label}</span>
                </NavLink>
              ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}