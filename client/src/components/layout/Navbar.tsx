import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from '../../assets/icons'
import { useCart } from '../../hooks/useCart'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'

const links = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/shop' },
  { label: 'New arrivals', href: '/new-arrivals' },
  { label: 'Orders', href: '/orders' },
]

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const navigate = useNavigate()
  const { totalQuantity } = useCart()
  const { user, logout } = useCustomerAuth()

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMenuOpen])

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const value = search.trim()
    navigate(value ? `/shop?search=${encodeURIComponent(value)}` : '/shop')
    setIsMenuOpen(false)
  }

  return (
    <header className="store-header">
      <div className="header-utility"><div className="container">Quality foodstuff, delivered with care</div></div>
      <nav className="container store-nav" aria-label="Main navigation">
        <button className="icon-button mobile-only" type="button" aria-label="Open navigation menu" onClick={() => setIsMenuOpen(true)}>
          <MenuIcon size={22} />
        </button>
        <Link className="brand-mark" to="/" aria-label="Ayanfe Food Variety home">
          <img src="/branding/ayanfe-food-variety-logo.png" alt="Ayanfe Food Variety" />
        </Link>
        <form className="search-form" onSubmit={submitSearch} role="search">
          <SearchIcon size={19} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, brands and categories" aria-label="Search products" />
          <button type="submit">Search</button>
        </form>
        <div className="store-actions">
          <Link className="account-link" to={user ? '/orders' : '/login'} aria-label={user ? 'Open your orders' : 'Sign in'}>
            <UserIcon size={22} /><span className="desktop-only">{user ? 'Account' : 'Sign in'}</span>
          </Link>
          <Link className="cart-link" to="/cart" aria-label={`Cart with ${totalQuantity} items`}>
            <BagIcon size={22} /><span className="desktop-only">Cart</span><b>{totalQuantity}</b>
          </Link>
        </div>
      </nav>
      <div className="desktop-nav container">
        {links.map((link) => <Link to={link.href} key={link.href}>{link.label}</Link>)}
        <Link to="#why-us">Why Ayanfe</Link>
        {user && <button type="button" onClick={() => void logout()}>Log out</button>}
      </div>
      <div className={`menu-backdrop ${isMenuOpen ? 'is-open' : ''}`} onClick={() => setIsMenuOpen(false)} />
      <aside className={`mobile-menu ${isMenuOpen ? 'is-open' : ''}`} aria-hidden={!isMenuOpen}>
        <div className="mobile-menu-head"><strong>Shop Ayanfe</strong><button className="icon-button" type="button" onClick={() => setIsMenuOpen(false)} aria-label="Close navigation menu"><CloseIcon size={22} /></button></div>
        <form className="search-form mobile-search" onSubmit={submitSearch} role="search">
          <SearchIcon size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the store" aria-label="Search the store" />
        </form>
        <div className="mobile-links">{links.map((link) => <Link to={link.href} onClick={() => setIsMenuOpen(false)} key={link.href}>{link.label}</Link>)}</div>
        {user ? <button className="logout-link" type="button" onClick={() => { setIsMenuOpen(false); void logout() }}>Log out</button> : <Link className="logout-link" to="/login" onClick={() => setIsMenuOpen(false)}>Sign in</Link>}
      </aside>
    </header>
  )
}