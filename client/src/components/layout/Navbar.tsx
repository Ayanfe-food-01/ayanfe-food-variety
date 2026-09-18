import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { MenuIcon } from '../../assets/icons'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { useWishlist } from '../../hooks/useWishlist'
import { useDropdown } from '../../hooks/useDropdown'
import { lockBodyScroll } from '../../utils/browserCompatibility'
import { DEFAULT_LOGO_PATH } from '../../seo/config'
import { CartDrawer } from '../cart/CartDrawer'
import { useMarketUi } from '../../hooks/useMarketUi'
import { AnnouncementTicker } from './AnnouncementTicker'
import { DesktopNavLinks } from './DesktopNavLinks'
import { MobileDrawer } from './MobileDrawer'
import { HeaderSearch } from './HeaderSearch'
import { HeaderActions } from './HeaderActions'
import { NavMeasurementHost } from './NavMeasurementHost'
import { useDesktopNavMeasurement } from './useDesktopNavMeasurement'

const links = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/shop' },
  { label: 'New arrivals', href: '/new-arrivals' },
  { label: 'About us', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Help', href: '/help' },
  { label: 'Orders', href: '/orders' },
  { label: 'Quotes', href: '/quotes' },
  { label: 'Track order', href: '/track-order' },
]

let pendingSearchFocus = false

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { isCartDrawerOpen, openCartDrawer, closeCartDrawer } = useMarketUi()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const closeMenuButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const headerSearchInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { isOpen: isMoreNavOpen, close: closeMoreNav, toggle: toggleMoreNav, rootRef: moreNavRef } = useDropdown()
  const { user, logout, openAuth } = useCustomerAuth()
  const { count: wishlistCount } = useWishlist()
  const { settings } = useStoreSettings()
  const logoUrl = settings?.logoUrl || DEFAULT_LOGO_PATH
  const announcementMessages = (settings?.announcementText ?? '')
    .split(/\r?\n|\|/)
    .map((message) => message.trim())
    .filter(Boolean)
  const { desktopNavRef, desktopNavMeasureRef, desktopNavCount } = useDesktopNavMeasurement(links, wishlistCount)

  useEffect(() => {
    if (!isMenuOpen) return
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const releaseBodyScroll = lockBodyScroll()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
      if (event.key !== 'Tab') return
      const drawer = document.querySelector<HTMLElement>('.mobile-menu')
      if (!drawer) return
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>('a, button, input, [tabindex]:not([tabindex="-1"])'))
        .filter((element) => !element.hasAttribute('disabled'))
      if (focusable.length === 0) return
      const first = focusable[ 0 ]
      const last = focusable[ focusable.length - 1 ]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    window.requestAnimationFrame(() => closeMenuButtonRef.current?.focus())
    return () => {
      releaseBodyScroll()
      document.removeEventListener('keydown', closeOnEscape)
      previousFocusRef.current?.focus()
    }
  }, [ isMenuOpen ])

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 8)
    updateScrollState()
    window.addEventListener('scroll', updateScrollState, { passive: true })
    return () => window.removeEventListener('scroll', updateScrollState)
  }, [])

  const submitSearch = (query: string) => {
    const trimmed = query.trim()
    if (pathname === '/shop' || pathname === '/new-arrivals') {
      const nextParams = new URLSearchParams(searchParams)
      if (trimmed) nextParams.set('search', trimmed)
      else nextParams.delete('search')
      setSearchParams(nextParams, { replace: true })
    } else {
      navigate(trimmed ? `/shop?search=${encodeURIComponent(trimmed)}` : '/shop')
      pendingSearchFocus = true
    }
    setIsMenuOpen(false)
  }

  useEffect(() => {
    if (!pendingSearchFocus) return
    pendingSearchFocus = false
    const input = headerSearchInputRef.current
    if (!input) return
    window.requestAnimationFrame(() => {
      input.focus()
      const length = input.value.length
      input.setSelectionRange(length, length)
    })
  }, [])

  return (
    <>
      <AnnouncementTicker messages={announcementMessages} />
      <header className={`sticky top-0 z-50 bg-cream/97 border-b border-line transition-[box-shadow] duration-200 ease-[ease] pt-[env(safe-area-inset-top)] ${isScrolled ? 'shadow-[0_8px_24px_rgb(20_33_22/0.10)]' : ''}`}>
        <nav className="container flex flex-wrap items-center gap-2 min-h-0 pt-[5px] pb-[9px] md:flex-nowrap md:min-h-[64px] md:gap-[18px] md:pt-0 md:pb-0" aria-label="Main navigation">
          <button className="grid place-items-center w-[36px] h-[36px] border-0 rounded-full bg-transparent text-green-dark cursor-pointer md:hidden" type="button" aria-label="Open navigation menu" onClick={() => setIsMenuOpen(true)}>
            <MenuIcon size={22} />
          </button>
          <Link className="block" to="/" aria-label="Ayanfe Food Variety home">
            <img className="w-[54px] h-[43px] object-contain md:w-[62px] md:h-[52px]" src={logoUrl} alt="Ayanfe Food Variety" />
          </Link>
          <HeaderSearch
            value={search}
            onChange={setSearch}
            onSearch={submitSearch}
            onSelectProduct={(product) => navigate(`/product/${encodeURIComponent(product.slug ?? product.id)}`)}
            inputRef={headerSearchInputRef}
          />
          <HeaderActions
            isCartDrawerOpen={isCartDrawerOpen}
            onOpenCart={openCartDrawer}
          />
        </nav>
        <DesktopNavLinks
          links={links}
          visibleCount={desktopNavCount}
          navRef={desktopNavRef}
          moreNavRef={moreNavRef}
          isMoreNavOpen={isMoreNavOpen}
          toggleMoreNav={toggleMoreNav}
          closeMoreNav={closeMoreNav}
          wishlistCount={wishlistCount}
        />
        <NavMeasurementHost links={links} measureRef={desktopNavMeasureRef} />
        <MobileDrawer
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          closeMenuButtonRef={closeMenuButtonRef}
          search={search}
          setSearch={setSearch}
          onSearch={submitSearch}
          onSelectProduct={(product) => navigate(`/product/${encodeURIComponent(product.slug ?? product.id)}`)}
          user={user}
          logout={logout}
          openAuth={openAuth}
          wishlistCount={wishlistCount}
          logoUrl={logoUrl}
        />
        <CartDrawer open={isCartDrawerOpen} onClose={closeCartDrawer} />
      </header>
    </>
  )
}