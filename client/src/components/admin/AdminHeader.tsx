import { useEffect, useState } from 'react'
import { ChevronDownIcon, MenuIcon, MoonIcon } from '../../assets/icons'
import { Link, useNavigate } from 'react-router-dom'
import type { AuthenticatedUser } from '../../services/authService'
import { AdminNotifications } from './AdminNotifications'
import { SearchBar } from '../ui/SearchBar'
import { useDropdown } from '../../hooks/useDropdown'
import { Popover } from '../ui/Popover'

interface AdminHeaderProps {
  isLoggingOut: boolean
  onLogout: () => void
  onOpenNavigation: () => void
  user: AuthenticatedUser
}

export function AdminHeader({ isLoggingOut, onLogout, onOpenNavigation, user }: AdminHeaderProps) {
  const [isDarkTheme, setIsDarkTheme] = useState(false)
  const { isOpen, close, toggle, rootRef } = useDropdown()
  const [searchValue, setSearchValue] = useState('')
  const navigate = useNavigate()

  const runAdminSearch = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    navigate(`/admin/products?search=${encodeURIComponent(trimmed)}`)
  }

  useEffect(() => {
    document.documentElement.classList.toggle('admin-dark', isDarkTheme)
  }, [isDarkTheme])

  useEffect(() => () => {
    document.documentElement.classList.remove('admin-dark')
  }, [])

  const profileInitial = user.name.trim().charAt(0).toUpperCase() || 'A'

  return (
      <header className="sticky top-0 z-20 border-b border-line bg-cream/90 px-4 backdrop-blur-xl sm:px-8 xl:px-10">
      <div className="flex min-h-[80px] items-center gap-3">
        <button
          className="rounded-xl border border-line bg-white p-2 text-green-dark xl:hidden"
          type="button"
          aria-label="Open admin navigation"
          onClick={onOpenNavigation}
        >
          <MenuIcon size={21} />
        </button>

        <div className="relative hidden min-w-0 flex-1 sm:block sm:max-w-md">
          <SearchBar
            value={searchValue}
            onChange={setSearchValue}
            onSearch={runAdminSearch}
            placeholder="Search products, orders…"
            ariaLabel="Search"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            className="grid size-10 place-items-center rounded-full border border-transparent bg-sage/45 text-green-dark transition-colors hover:border-line hover:bg-white"
            type="button"
            aria-label={isDarkTheme ? 'Use light theme' : 'Use dark theme'}
            aria-pressed={isDarkTheme}
            onClick={() => setIsDarkTheme((current) => !current)}
          >
            <MoonIcon size={18} />
          </button>
          <AdminNotifications />
          <div className="relative" ref={rootRef}>
            <button
              className="flex min-h-10 items-center gap-2 rounded-full border border-line bg-white px-1.5 py-1.5 text-left text-green-dark transition-colors hover:border-green/30 hover:bg-sage/30 disabled:cursor-wait disabled:opacity-60"
              type="button"
              aria-expanded={isOpen}
              aria-haspopup="menu"
              aria-label={`Open account menu for ${user.name}`}
              onClick={toggle}
              disabled={isLoggingOut}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sage text-xs font-bold text-green-dark">{profileInitial}</span>
              <span className="hidden max-w-28 truncate text-xs font-bold sm:block">{user.name}</span>
              <ChevronDownIcon className={`mr-1 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} size={15} />
            </button>
            <Popover
              isOpen={isOpen}
              onClose={close}
              className="right-0 top-[calc(100%+0.75rem)] w-64 p-2"
              surface="white"
              role="menu"
              ariaLabel="Account menu"
            >
              {(closeMenu) => (
                <>
                  <div className="border-b border-line px-3 py-2.5">
                    <p className="truncate text-sm font-bold text-green-dark">{user.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>
                  </div>
                  <Link
                    className="mt-2 flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold text-green-dark transition-colors hover:bg-sage/45"
                    to="/admin/settings"
                    role="menuitem"
                    onClick={closeMenu}
                  >
                    Settings
                  </Link>
                  <button
                    className="mt-1 flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-orange transition-colors hover:bg-orange/10"
                    type="button"
                    role="menuitem"
                    onClick={onLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? 'Logging out…' : 'Log out'}
                  </button>
                </>
              )}
            </Popover>
          </div>
        </div>
      </div>
    </header>
  )
}