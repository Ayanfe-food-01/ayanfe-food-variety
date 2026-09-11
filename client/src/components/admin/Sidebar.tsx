import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, NavLink } from 'react-router-dom'
import {
  BellIcon,
  BoxesIcon,
  CheckIcon,
  ClipboardListIcon,
  CreditCardIcon,
  FileTextIcon,
  GlobeIcon,
  HeartIcon,
  LayersIcon,
  LayoutDashboardIcon,
  MailIcon,
  MapPinIcon,
  MegaphoneIcon,
  PackageIcon,
  PanelLeftCloseIcon,
  PanelRightCloseIcon,
  SettingsIcon,
  ShieldIcon,
  ShoppingCartIcon,
  SparkIcon,
  TagsIcon,
  TruckIcon,
  UserIcon,
  WalletIcon,
} from '../../assets/icons'
import { createPortal } from 'react-dom'
import { Accordion, type AccordionSection } from '../ui/Accordion'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { DEFAULT_LOGO_PATH } from '../../seo/config'

interface NavLinkItem {
  label: string
  to: string
  icon?: ReactNode
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
  isCollapsed: boolean
  onToggleCollapse: () => void
}

const dashboard: NavLinkItem = { label: 'Dashboard', to: '/admin', end: true, icon: <LayoutDashboardIcon size={18} strokeWidth={2.2} /> }

const navGroups: NavGroup[] = [
  {
    label: 'Sales',
    icon: <ClipboardListIcon size={18} strokeWidth={2.2} />,
    links: [
      { label: 'Orders', to: '/admin/orders', icon: <ShoppingCartIcon size={18} strokeWidth={2} /> },
      { label: 'Quote Requests', to: '/admin/quote-requests', icon: <FileTextIcon size={18} strokeWidth={2} /> },
      { label: 'Analytics', to: '/admin/analytics', icon: <SparkIcon size={18} strokeWidth={2} /> },
      { label: 'Customers', to: '/admin/customers', icon: <UserIcon size={18} strokeWidth={2} /> },
    ],
  },
  {
    label: 'Products',
    icon: <LayersIcon size={18} strokeWidth={2.2} />,
    links: [
      { label: 'Products', to: '/admin/products', icon: <PackageIcon size={18} strokeWidth={2} /> },
      { label: 'Categories', to: '/admin/categories', icon: <TagsIcon size={18} strokeWidth={2} /> },
    ],
  },
  {
    label: 'Inventory',
    icon: <TruckIcon size={18} strokeWidth={2.2} />,
    links: [{ label: 'Inventory', to: '/admin/inventory', icon: <BoxesIcon size={18} strokeWidth={2} /> }],
  },
  {
    label: 'Store',
    icon: <GlobeIcon size={18} strokeWidth={2.2} />,
    links: [
      { label: 'Delivery Zones & Fees', to: '/admin/delivery-zones', icon: <MapPinIcon size={18} strokeWidth={2} /> },
      { label: 'Promotional Banners', to: '/admin/banners', icon: <MegaphoneIcon size={18} strokeWidth={2} /> },
      { label: 'Testimonials', to: '/admin/testimonials', icon: <HeartIcon size={18} strokeWidth={2} /> },
      { label: 'Reviews', to: '/admin/reviews', icon: <CheckIcon size={18} strokeWidth={2} /> },
    ],
  },
  {
    label: 'Finance',
    icon: <CreditCardIcon size={18} strokeWidth={2.2} />,
    links: [{ label: 'Payments', to: '/admin/payments', icon: <WalletIcon size={18} strokeWidth={2} /> }],
  },
  {
    label: 'Communication',
    icon: <MailIcon size={18} strokeWidth={2.2} />,
    links: [{ label: 'Notifications', to: '/admin/notifications', icon: <BellIcon size={18} strokeWidth={2} /> }],
  },
  {
    label: 'System',
    icon: <ShieldIcon size={18} strokeWidth={2.2} />,
    links: [{ label: 'Settings', to: '/admin/settings', icon: <SettingsIcon size={18} strokeWidth={2} /> }],
  },
]

const isActivePath = (link: NavLinkItem, pathname: string) =>
  link.end ? pathname === link.to || pathname === `${link.to}/` : pathname.startsWith(link.to)

const groupForPath = (pathname: string): string | undefined =>
  navGroups.find((group) => group.links.some((link) => isActivePath(link, pathname)))?.label

const activeNavClasses = 'bg-cream text-green-dark'
const inactiveNavClasses = 'text-cream/80 xl:hover:bg-cream/10 hover:text-cream'

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const { settings } = useStoreSettings()
  const logoUrl = settings?.logoUrl || DEFAULT_LOGO_PATH
  const { pathname } = useLocation()
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const activeGroup = groupForPath(pathname)
    return activeGroup ? [activeGroup] : []
  })
  const [flyout, setFlyout] = useState<{ label: string; left: number; top: number } | null>(null)
  const flyoutRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const activeGroup = groupForPath(pathname)
      if (activeGroup) {
        setOpenGroups((current) => (current.includes(activeGroup) ? current : [activeGroup]))
      }
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [pathname])

  useEffect(() => {
    if (!isOpen || isCollapsed) return
    const timeoutId = window.setTimeout(() => {
      const activeGroup = groupForPath(pathname)
      if (activeGroup) {
        setOpenGroups((current) => (current.includes(activeGroup) ? current : [activeGroup]))
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

  const expandedLink = (link: NavLinkItem, nested = false) => (
    <NavLink
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl py-2.5 text-sm font-bold transition-colors ${nested ? 'ml-9 px-3 pr-3' : 'px-3'} ${isActive ? activeNavClasses : inactiveNavClasses}`
      }
      end={link.end}
      key={link.to}
      to={link.to}
      onClick={onClose}
    >
      {link.icon && <span className="shrink-0">{link.icon}</span>}
      <span className="min-w-0 flex-1 truncate">{link.label}</span>
    </NavLink>
  )

  const accordionItems: AccordionSection[] = navGroups.map((group) => ({
    id: group.label,
    icon: group.icon,
    label: group.label,
    headingClassName: group.links.some((link) => isActivePath(link, pathname))
      ? 'text-cream'
      : 'text-cream/45 hover:text-cream/80',
    content: (
      <div className="mt-1 space-y-1">
        {group.links.map((link) => expandedLink(link, true))}
      </div>
    ),
  }))

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
            <Accordion
              ariaLabel="Admin navigation groups"
              className="space-y-6"
              items={accordionItems}
              onChange={setOpenGroups}
              open={openGroups}
            />
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
          {isCollapsed ? (
            <div className="hidden xl:flex xl:justify-center">
              <button
                aria-label="Expand sidebar"
                className="grid size-10 place-items-center rounded-xl text-cream/70 transition-colors xl:hover:bg-cream/10 hover:text-cream"
                onClick={onToggleCollapse}
                type="button"
              >
                <PanelRightCloseIcon size={18} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              className="hidden w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-cream/45 transition-colors hover:text-cream/80 xl:flex"
              onClick={onToggleCollapse}
              type="button"
            >
              Collapse
              <PanelLeftCloseIcon size={16} aria-hidden="true" />
            </button>
          )}
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
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${isActive ? activeNavClasses : inactiveNavClasses}`
                  }
                  end={link.end}
                  key={link.to}
                  role="menuitem"
                  to={link.to}
                  onClick={() => setFlyout(null)}
                >
                  {link.icon && <span className="shrink-0">{link.icon}</span>}
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