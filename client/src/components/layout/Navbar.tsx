import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BagIcon, CloseIcon, MenuIcon } from '../../assets/icons'
import { useCart } from '../../hooks/useCart'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { NavigationLinks, NavigationMenu, type NavigationItem } from './NavigationLinks'

const links: NavigationItem[] = [
  { label: 'Home', href: '#home' },
  { label: 'Shop', href: '/shop' },
  { label: 'Orders', href: '/orders' },
  { label: 'About', href: '#why-us' },
  { label: 'Contact', href: '#contact' },
]

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { totalQuantity } = useCart()
  const { user, logout } = useCustomerAuth()
  const closeMenu = () => setIsMenuOpen(false)

  useEffect(() => {
    if (!isMenuOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen])

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-cream/90 backdrop-blur-xl">
      <nav className="container relative flex min-h-[68px] items-center justify-between gap-8 py-3 md:min-h-[78px] md:py-4" aria-label="Main navigation">
        <a className="inline-flex items-center" href="#home" aria-label="Ayanfe Food Variety home">
          <img className="h-16 w-16 object-contain md:h-[74px] md:w-[74px]" src="/branding/ayanfe-food-variety-logo.png" alt="Ayanfe Food Variety logo" />
        </a>

        <NavigationMenu isOpen={isMenuOpen} onClose={closeMenu}>
          <div className="mb-8 flex items-center justify-between md:hidden">
            <a className="inline-flex items-center" href="#home" onClick={closeMenu} aria-label="Ayanfe Food Variety home">
              <img className="h-16 w-16 object-contain" src="/branding/ayanfe-food-variety-logo.png" alt="Ayanfe Food Variety logo" />
            </a>
            <button
              className="grid size-11 place-items-center rounded-full border border-line text-green transition-colors hover:bg-sage"
              type="button"
              aria-label="Close menu"
              onClick={closeMenu}
            >
              <CloseIcon size={22} />
            </button>
          </div>
          <NavigationLinks
            items={links}
            className="border-b border-line/70 px-3 py-4 transition-colors duration-200 hover:text-green md:border-0 md:p-0"
            onNavigate={closeMenu}
          />
          {user ? (
            <>
              <button className="border-b border-line/70 p-3 text-left text-muted transition-colors hover:text-orange md:hidden" type="button" onClick={() => { closeMenu(); void logout() }}>
                Log out
              </button>
            </>
          ) : (
            <Link className="border-b border-line/70 p-3 transition-colors duration-200 hover:text-green md:hidden" to="/login" onClick={closeMenu}>
              Login
            </Link>
          )}
          <Link className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-green/20 px-4 py-3 text-sm font-bold text-green transition-all duration-200 hover:bg-green hover:text-cream md:hidden" to="/cart" onClick={closeMenu}>
            <BagIcon size={18} />
            <span>Cart{totalQuantity > 0 ? ` · ${totalQuantity}` : ''}</span>
          </Link>
        </NavigationMenu>

        <Link className="hidden items-center gap-2 rounded-full border border-green/20 px-4 py-2 text-sm font-bold text-green transition-all duration-200 hover:bg-green hover:text-cream md:inline-flex" to="/cart" aria-label={`View cart${totalQuantity > 0 ? `, ${totalQuantity} items` : ''}`}>
          <BagIcon size={20} />
          <span>Cart</span>
          <span className="grid min-w-5 place-items-center rounded-full bg-orange px-1.5 py-0.5 text-[10px] text-cream" aria-label={`${totalQuantity} items in cart`}>
            {totalQuantity}
          </span>
        </Link>
        {user ? (
          <div className="hidden items-center gap-3 md:flex">
            <Link className="text-sm font-bold text-green transition-colors hover:text-orange" to="/orders" aria-label="Open your account">
              {user.name || 'Account'}
            </Link>
            <button className="text-xs font-semibold text-muted transition-colors hover:text-orange" type="button" onClick={() => void logout()}>
              Log out
            </button>
          </div>
        ) : (
          <Link className="hidden text-sm text-muted transition-colors duration-200 hover:text-green md:block" to="/login">
            Login
          </Link>
        )}
        <button
          className="border-0 bg-transparent p-2 text-green md:hidden"
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <MenuIcon size={24} />
        </button>
      </nav>
    </header>
  )
}