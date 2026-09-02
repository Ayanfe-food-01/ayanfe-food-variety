import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardListIcon, HeartIcon, LayersIcon, UserIcon } from '../../assets/icons'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'

const menuItems = [
  { label: 'Account settings', href: '/account', icon: UserIcon },
  { label: 'My orders', href: '/orders', icon: ClipboardListIcon },
  { label: 'My quotes', href: '/quotes', icon: LayersIcon },
  { label: 'Wishlist', href: '/wishlist', icon: HeartIcon },
]

export function AccountMenu() {
  const { user, openAuth, logout } = useCustomerAuth()
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  const handleTriggerClick = () => {
    if (user) setIsOpen((open) => !open)
    else openAuth()
  }

  const handleNavigate = (href: string) => {
    setIsOpen(false)
    navigate(href)
  }

  const handleSignOut = () => {
    setIsOpen(false)
    void logout()
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
      {user && isOpen && (
        <div className="account-menu-panel" role="menu" aria-label="Account menu">
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
          <button className="account-menu-item account-menu-item--signout" type="button" role="menuitem" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}