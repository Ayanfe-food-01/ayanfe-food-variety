import type { Ref } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDownIcon } from '../../assets/icons'
import { Popover } from '../ui/Popover'
import { ShoppingModeSwitch } from './ShoppingModeSwitch'

interface NavLink {
  label: string
  href: string
}

interface DesktopNavLinksProps {
  links: NavLink[]
  visibleCount: number
  moreNavRef: React.RefObject<HTMLDivElement | null>
  isMoreNavOpen: boolean
  toggleMoreNav: () => void
  closeMoreNav: () => void
  wishlistCount: number
  navRef?: Ref<HTMLDivElement>
}

export function DesktopNavLinks({
  links,
  visibleCount,
  moreNavRef,
  isMoreNavOpen,
  toggleMoreNav,
  closeMoreNav,
  wishlistCount,
  navRef,
}: DesktopNavLinksProps) {
  return (
    <div
      ref={navRef}
      className="desktop-nav container hidden md:relative md:flex md:items-center md:gap-[18px] md:min-h-[36px] md:text-muted md:text-[11px] md:font-semibold lg:gap-[27px] lg:text-xs before:absolute before:top-0 before:left-1/2 before:w-screen before:border-t before:border-line before:content-[''] before:-translate-x-1/2 [&_a]:transition-colors [&_a]:duration-150 [&_a]:hover:text-orange [&_button]:transition-colors [&_button]:duration-150 [&_button]:hover:text-orange"
    >
      {links.slice(0, visibleCount).map((link) => (
        <Link className="text-muted hover:text-orange transition-colors duration-150" to={link.href} key={link.href}>{link.label}</Link>
      ))}
      {visibleCount < links.length && (
        <div className="relative" ref={moreNavRef}>
          <button
            className="inline-flex items-center gap-[5px] text-muted font-semibold border-0 p-0 bg-transparent text-[inherit] cursor-pointer hover:text-orange transition-colors duration-150"
            type="button"
            aria-haspopup="menu"
            aria-expanded={isMoreNavOpen}
            onClick={toggleMoreNav}
          >
            More <ChevronDownIcon size={14} />
          </button>
          <Popover
            isOpen={isMoreNavOpen}
            onClose={closeMoreNav}
            className="top-[calc(100%+8px)] left-0 min-w-[190px] p-2"
            role="menu"
            ariaLabel="More navigation"
          >
            {(close) => (
              <>
                {links.slice(visibleCount).map((link) => (
                  <Link className="block w-full py-[11px] px-[14px] rounded-lg text-muted whitespace-nowrap font-semibold transition-[background-color,color] duration-150 ease-[ease] hover:text-orange hover:bg-sage" to={link.href} role="menuitem" key={link.href} onClick={close}>{link.label}</Link>
                ))}
                <Link className="inline-flex items-center gap-[5px] block w-full py-[11px] px-[14px] rounded-lg text-muted whitespace-nowrap font-semibold transition-[background-color,color] duration-150 ease-[ease] hover:text-orange hover:bg-sage" to="/wishlist" role="menuitem" aria-label={`Wishlist with ${wishlistCount} saved items`} onClick={close}>Wishlist {wishlistCount > 0 && <b className="inline-grid min-w-[18px] h-[18px] place-items-center rounded-full bg-orange text-white text-[10px] font-bold">{wishlistCount}</b>}</Link>
              </>
            )}
          </Popover>
        </div>
      )}
      {visibleCount >= links.length && (
        <Link className="inline-flex items-center gap-[5px] text-muted hover:text-orange transition-colors duration-150" to="/wishlist" aria-label={`Wishlist with ${wishlistCount} saved items`}>Wishlist {wishlistCount > 0 && <b className="inline-grid min-w-[18px] h-[18px] place-items-center rounded-full bg-orange text-white text-[10px] font-bold">{wishlistCount}</b>}</Link>
      )}
      <ShoppingModeSwitch className="desktop-shopping-mode" />
    </div>
  )
}
