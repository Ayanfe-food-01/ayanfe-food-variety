import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CartIcon, CloseIcon, HeartIcon, MenuIcon, UserIcon } from '../../assets/icons'
import { useCart } from '../../hooks/useCart'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { ProductSearchAutocomplete } from '../products/ProductSearchAutocomplete'
import { useWishlist } from '../../hooks/useWishlist'

const links = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/shop' },
  { label: 'New arrivals', href: '/new-arrivals' },
  { label: 'About us', href: '/about' },
  { label: 'Orders', href: '/orders' },
]

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const navigate = useNavigate()
  const { totalQuantity } = useCart()
  const { user, logout } = useCustomerAuth()
  const { count: wishlistCount } = useWishlist()
  const { settings } = useStoreSettings()
  const announcementMessages = (settings?.announcementText ?? '')
    .split(/\r?\n|\|/)
    .map((message) => message.trim())
    .filter(Boolean)

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMenuOpen])

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 8)
    updateScrollState()
    window.addEventListener('scroll', updateScrollState, { passive: true })
    return () => window.removeEventListener('scroll', updateScrollState)
  }, [])

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const value = search.trim()
    navigate(value ? `/shop?search=${encodeURIComponent(value)}` : '/shop')
    setIsMenuOpen(false)
  }

  return (
    <header className={`store-header ${isScrolled ? 'is-scrolled' : ''}`}>
      <div className="header-utility" aria-label="Store announcements">
        {announcementMessages.length > 0 && (
          <div className="ticker-viewport">
            <div className="ticker-track">
              {[0, 1].map((group) => (
                <div className="ticker-group" aria-hidden={group === 1} key={group}>
                  {announcementMessages.map((message, index) => (
                    <span className="ticker-message" key={`${group}-${index}-${message}`}>
                      {message}
                      <span className="ticker-separator" aria-hidden="true">•</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <nav className="container store-nav" aria-label="Main navigation">
        <button className="icon-button mobile-only" type="button" aria-label="Open navigation menu" onClick={() => setIsMenuOpen(true)}>
          <MenuIcon size={22} />
        </button>
        <Link className="brand-mark" to="/" aria-label="Ayanfe Food Variety home">
          <img src="/branding/ayanfe-food-variety-logo.png" alt="Ayanfe Food Variety" />
        </Link>
        <ProductSearchAutocomplete
          value={search}
          onChange={setSearch}
          onSubmit={submitSearch}
          onSelectProduct={(product) => navigate(`/product/${encodeURIComponent(product.slug ?? product.id)}`)}
          placeholder="Search products, brands and categories"
          ariaLabel="Search products"
          showSubmitButton
        />
        <div className="store-actions">
          <Link className="account-link" to={user ? '/orders' : '/login'} aria-label={user ? 'Open your orders' : 'Sign in'}>
            <UserIcon size={22} /><span className="desktop-only">{user ? 'Account' : 'Sign in'}</span>
          </Link>
          <Link className="cart-link" to="/cart" aria-label={`Cart with ${totalQuantity} items`}>
            <CartIcon size={22} /><span className="desktop-only">Cart</span><b>{totalQuantity}</b>
          </Link>
        </div>
      </nav>
      <div className="desktop-nav container">
        {links.map((link) => <Link to={link.href} key={link.href}>{link.label}</Link>)}
        <Link className="wishlist-nav-link" to="/wishlist" aria-label={`Wishlist with ${wishlistCount} saved items`}><HeartIcon size={15} /> Wishlist {wishlistCount > 0 && <b>{wishlistCount}</b>}</Link>
        {user && <button type="button" onClick={() => void logout()}>Log out</button>}
      </div>
      <div className={`menu-backdrop ${isMenuOpen ? 'is-open' : ''}`} onClick={() => setIsMenuOpen(false)} />
      <aside className={`mobile-menu ${isMenuOpen ? 'is-open' : ''}`} aria-hidden={!isMenuOpen}>
        <div className="mobile-menu-head">
          <img className="mobile-menu-logo" src="/branding/ayanfe-food-variety-logo.png" alt="Ayanfe Food Variety" />
          <button className="icon-button" type="button" onClick={() => setIsMenuOpen(false)} aria-label="Close navigation menu"><CloseIcon size={22} /></button>
        </div>
        <ProductSearchAutocomplete
          className="mobile-search"
          value={search}
          onChange={setSearch}
          onSubmit={submitSearch}
          onSelectProduct={(product) => {
            setIsMenuOpen(false)
            navigate(`/product/${encodeURIComponent(product.slug ?? product.id)}`)
          }}
          placeholder="Search the store"
          ariaLabel="Search the store"
        />
        <div className="mobile-links">
          {links.map((link) => <Link to={link.href} onClick={() => setIsMenuOpen(false)} key={link.href}>{link.label}</Link>)}
           <Link to="/wishlist" onClick={() => setIsMenuOpen(false)}>Wishlist {wishlistCount > 0 && <b>{wishlistCount}</b>}</Link>
        </div>
        {user ? <button className="logout-link" type="button" onClick={() => { setIsMenuOpen(false); void logout() }}>Log out</button> : <Link className="logout-link" to="/login" onClick={() => setIsMenuOpen(false)}>Sign in</Link>}
      </aside>
    </header>
  )
}