import { useNavigate } from 'react-router-dom'
import { ClipboardListIcon, HeartIcon, LayersIcon, UserIcon } from '../../assets/icons'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { useDropdown } from '../../hooks/useDropdown'
import { Popover } from '../ui/Popover'

const menuItems = [
  { label: 'Account settings', href: '/account', icon: UserIcon },
  { label: 'My orders', href: '/orders', icon: ClipboardListIcon },
  { label: 'My quotes', href: '/quotes', icon: LayersIcon },
  { label: 'Wishlist', href: '/wishlist', icon: HeartIcon },
]

export function AccountMenu() {
  const { user, openAuth, logout } = useCustomerAuth()
  const { isOpen, close, toggle, rootRef } = useDropdown()
  const navigate = useNavigate()

  const handleTriggerClick = () => {
    if (user) toggle()
    else openAuth()
  }

  const handleNavigate = (href: string) => {
    close()
    navigate(href)
  }

  return (
    <div className="relative flex" ref={rootRef}>
      <button
        className="flex items-center gap-[6px] text-green-dark text-[13px] font-bold p-[5px] md:p-0"
        type="button"
        aria-haspopup={user ? 'menu' : undefined}
        aria-expanded={user ? isOpen : undefined}
        onClick={handleTriggerClick}
      >
        <UserIcon size={22} /><span className="hidden md:block">{user ? 'Account' : 'Sign in'}</span>
      </button>
      {user && (
        <Popover
          isOpen={isOpen}
          onClose={close}
          className="top-[calc(100%+10px)] right-0 min-w-[232px] max-w-[min(86vw,320px)] p-1.5 max-md:top-[calc(100%+12px)] max-md:p-2"
          role="menu"
          ariaLabel="Account menu"
        >
          {(closeMenu) => (
            <>
              <div className="px-3 pt-[9px] pb-[11px] border-b border-line">
                <p className="m-0 text-green-dark text-[13px] font-extrabold overflow-hidden text-ellipsis whitespace-nowrap">{user.name}</p>
                <p className="mt-[3px] mb-0 text-muted text-[11px] overflow-hidden text-ellipsis whitespace-nowrap">{user.email}</p>
              </div>
              {menuItems.map((item) => (
                <button className="flex w-full items-center gap-[10px] border-0 rounded-[10px] bg-transparent p-[10px_12px] text-ink text-[13px] font-semibold text-left cursor-pointer transition-[background-color,color] duration-150 ease-[ease] hover:bg-sage hover:text-green-dark [&_svg]:shrink-0 [&_svg]:text-green hover:[&_svg]:text-green-dark" type="button" role="menuitem" key={item.href} onClick={() => handleNavigate(item.href)}>
                  <item.icon size={16} />{item.label}
                </button>
              ))}
              <div className="h-px my-[6px] bg-line" />
              <button className="flex w-full items-center gap-[10px] border-0 rounded-[10px] bg-transparent p-[10px_12px] text-orange text-[13px] font-semibold text-left cursor-pointer transition-[background-color,color] duration-150 ease-[ease] hover:bg-orange hover:text-white [&_svg]:shrink-0 [&_svg]:text-green hover:[&_svg]:text-green-dark" type="button" role="menuitem" onClick={() => { closeMenu(); void logout() }}>
                Sign out
              </button>
            </>
          )}
        </Popover>
      )}
    </div>
  )
}