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
    <div className="account-menu" ref={rootRef}>
      <button
        className="account-link"
        type="button"
        aria-haspopup={user ? 'menu' : undefined}
        aria-expanded={user ? isOpen : undefined}
        onClick={handleTriggerClick}
      >
        <UserIcon size={22} /><span className="desktop-only">{user ? 'Account' : 'Sign in'}</span>
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
              <div className="account-menu-header">
                <p className="account-menu-name">{user.name}</p>
                <p className="account-menu-email">{user.email}</p>
              </div>
              {menuItems.map((item) => (
                <button className="account-menu-item" type="button" role="menuitem" key={item.href} onClick={() => handleNavigate(item.href)}>
                  <item.icon size={16} />{item.label}
                </button>
              ))}
              <div className="account-menu-divider" />
              <button className="account-menu-item account-menu-item--signout" type="button" role="menuitem" onClick={() => { closeMenu(); void logout() }}>
                Sign out
              </button>
            </>
          )}
        </Popover>
      )}
    </div>
  )
}