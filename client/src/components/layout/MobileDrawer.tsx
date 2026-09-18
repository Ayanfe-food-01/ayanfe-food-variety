import { Link } from 'react-router-dom'
import { CloseIcon } from '../../assets/icons'
import { ProductSearchAutocomplete } from '../products/ProductSearchAutocomplete'
import { ShoppingModeSwitch } from './ShoppingModeSwitch'
import type { AuthenticatedUser } from '../../services/authService'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  closeMenuButtonRef: React.RefObject<HTMLButtonElement | null>
  search: string
  setSearch: (value: string) => void
  onSearch: (query: string) => void
  onSelectProduct: (product: { slug?: string; id: string }) => void
  user: AuthenticatedUser | null
  logout: () => Promise<void>
  openAuth: (callback?: () => void) => void
  wishlistCount: number
  logoUrl: string
}

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

export function MobileDrawer({
  isOpen,
  onClose,
  closeMenuButtonRef,
  search,
  setSearch,
  onSearch,
  onSelectProduct,
  user,
  logout,
  openAuth,
  wishlistCount,
  logoUrl,
}: MobileDrawerProps) {
  return (
    <>
      <div
        className={`block fixed z-[60] inset-0 bg-[#142116]/45 opacity-0 pointer-events-none transition-opacity duration-200 ease-[ease] motion-reduce:transition-none md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : ''
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`mobile-menu flex flex-col fixed z-[70] inset-y-0 left-0 right-auto w-[min(84vw,330px)] max-w-full h-dvh overflow-x-hidden overflow-y-auto y-scrollbar bg-cream -translate-x-full transition-transform duration-[250ms] ease-[ease] motion-reduce:transition-none p-[calc(18px+env(safe-area-inset-top))] px-[18px] pb-[calc(18px+env(safe-area-inset-bottom))] md:hidden ${
          isOpen ? 'translate-x-0' : ''
        }`}
        aria-hidden={!isOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Store navigation"
      >
        <div className="flex items-center justify-between mb-5 text-green-dark">
          <img className="w-[68px] h-[46px] object-contain" src={logoUrl} alt="Ayanfe Food Variety" />
          <button ref={closeMenuButtonRef} className="grid place-items-center w-[42px] h-[42px] border border-line rounded-full bg-transparent text-green-dark cursor-pointer" type="button" onClick={onClose} aria-label="Close navigation menu"><CloseIcon size={22} /></button>
        </div>
        <ProductSearchAutocomplete
          className="flex-none w-full min-w-0 max-w-full mb-[18px]"
          value={search}
          onChange={setSearch}
          onSearch={onSearch}
          onSelectProduct={(product) => {
            onClose()
            onSelectProduct(product)
          }}
          placeholder="Search the store"
          ariaLabel="Search the store"
          liveSearch={false}
        />
        <ShoppingModeSwitch className="mobile-shopping-mode" />
        <div className="grid border-t border-line">
          {links.map((link) => (
            <Link
              className="flex items-center gap-[7px] py-[15px] px-[2px] border-0 border-b border-line bg-transparent text-ink text-left font-bold"
              to={link.href}
              onClick={onClose}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
          <Link
            className="flex items-center gap-[7px] py-[15px] px-[2px] border-0 border-b border-line bg-transparent text-ink text-left font-bold"
            to="/wishlist"
            onClick={onClose}
          >
            Wishlist {wishlistCount > 0 && <b className="inline-grid min-w-[18px] h-[18px] place-items-center rounded-full bg-orange text-white text-[10px] font-bold">{wishlistCount}</b>}
          </Link>
        </div>
        {user ? (
          <button className="block w-full mt-auto py-[15px] px-[2px] border-0 bg-transparent text-orange text-left font-bold cursor-pointer" type="button" onClick={() => { onClose(); void logout() }}>Log out</button>
        ) : (
          <button className="block w-full mt-auto py-[15px] px-[2px] border-0 bg-transparent text-orange text-left font-bold cursor-pointer" type="button" onClick={() => { onClose(); openAuth() }}>Sign in</button>
        )}
      </aside>
    </>
  )
}
