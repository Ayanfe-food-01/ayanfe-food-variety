import { useState } from 'react'
import { BagIcon, CloseIcon, MenuIcon } from '../../assets/icons'
import { useCart } from '../../hooks/useCart'
import { useStoreSettings } from '../../hooks/useStoreSettings'

const links = [
  { label: 'Home', href: '#home' },
  { label: 'Shop', href: '/shop' },
  { label: 'About', href: '#why-us' },
  { label: 'Contact', href: '#contact' },
]

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { totalQuantity } = useCart()
  const { settings } = useStoreSettings()
  const businessName = settings?.businessName || 'Store'

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-cream/90 backdrop-blur-xl">
      <nav className="container flex min-h-[68px] items-center justify-between gap-8 md:min-h-[78px]" aria-label="Main navigation">
        <a className="inline-flex items-center gap-3" href="#home" aria-label={`${businessName} home`}>
          <span className="grid size-10 place-items-center rounded-full bg-green font-display text-lg font-bold text-cream">A</span>
          <span className="text-[13px] tracking-[0.01em]">
            {businessName}
          </span>
        </a>

        <div className={`absolute left-4 right-4 top-[76px] ${isMenuOpen ? 'flex' : 'hidden'} flex-col items-stretch gap-0 rounded-[18px] border border-line bg-cream p-2 text-sm font-medium text-muted shadow-[0_18px_40px_rgba(32,60,36,0.12)] md:static md:flex md:flex-row md:items-center md:gap-8 md:border-0 md:bg-transparent md:p-0 md:shadow-none ${isMenuOpen ? 'md:flex' : ''}`}>
          {links.map((link) => (
            <a className="p-3 transition-colors duration-200 hover:text-green md:p-0" key={link.label} href={link.href} onClick={() => setIsMenuOpen(false)}>
              {link.label}
            </a>
          ))}
          <a className="p-3 font-bold text-green transition-colors duration-200 hover:text-orange md:p-0" href="/admin/login" onClick={() => setIsMenuOpen(false)}>
            Admin portal
          </a>
          <a className="mt-1 inline-flex items-center justify-center gap-2 rounded-full border border-green/20 px-4 py-2 text-sm font-bold text-green transition-all duration-200 hover:bg-green hover:text-cream md:hidden" href="/cart" onClick={() => setIsMenuOpen(false)}>
            <BagIcon size={18} />
            <span>Cart{totalQuantity > 0 ? ` · ${totalQuantity}` : ''}</span>
          </a>
        </div>

        <a className="hidden items-center gap-2 rounded-full border border-green/20 px-4 py-2 text-sm font-bold text-green transition-all duration-200 hover:bg-green hover:text-cream md:inline-flex" href="/cart" aria-label={`View cart${totalQuantity > 0 ? `, ${totalQuantity} items` : ''}`}>
          <BagIcon size={20} />
          <span>Cart</span>
          <span className="grid min-w-5 place-items-center rounded-full bg-orange px-1.5 py-0.5 text-[10px] text-cream" aria-label={`${totalQuantity} items in cart`}>
            {totalQuantity}
          </span>
        </a>
        <button
          className="border-0 bg-transparent p-2 text-green md:hidden"
          type="button"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
        </button>
      </nav>
    </header>
  )
}