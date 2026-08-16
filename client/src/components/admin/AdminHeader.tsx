import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon, MenuIcon, MoonIcon, SearchIcon } from '../../assets/icons'
import { Link } from 'react-router-dom'
import type { AuthenticatedUser } from '../../services/authService'
import { AdminNotifications } from './AdminNotifications'

interface AdminHeaderProps {
  isLoggingOut: boolean
  onLogout: () => void
  onOpenNavigation: () => void
  user: AuthenticatedUser
}

export function AdminHeader({ isLoggingOut, onLogout, onOpenNavigation, user }: AdminHeaderProps) {
  const [isDarkTheme, setIsDarkTheme] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('admin-dark', isDarkTheme)
  }, [isDarkTheme])

  useEffect(() => () => {
    document.documentElement.classList.remove('admin-dark')
  }, [])

  useEffect(() => {
    if (!isProfileMenuOpen) return

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setIsProfileMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeOnPointerDown)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isProfileMenuOpen])

  const profileInitial = user.name.trim().charAt(0).toUpperCase() || 'A'

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-cream/90 px-4 backdrop-blur-xl sm:px-8 lg:px-10">
      <div className="relative flex min-h-[80px] items-center gap-3">
        <button
          className="rounded-xl border border-line bg-white p-2 text-green-dark lg:hidden"
          type="button"
          aria-label="Open admin navigation"
          onClick={onOpenNavigation}
        >
          <MenuIcon size={21} />
        </button>

        <label className="relative hidden min-w-0 flex-1 sm:block sm:max-w-md">
          <span className="sr-only">Search admin portal</span>
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={17} />
          <input
            className="h-11 w-full rounded-full border border-transparent bg-sage/45 pl-11 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-green/20 focus:bg-white focus:ring-2 focus:ring-green/10"
            type="search"
            placeholder="Search admin portal..."
            aria-label="Search admin portal"
          />
        </label>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden text-xs text-muted xl:inline">Store operations</span>
          <button
            className="grid size-10 place-items-center rounded-full border border-transparent bg-sage/45 text-green-dark transition-colors hover:border-line hover:bg-white"
            type="button"
            aria-label={isDarkTheme ? 'Use light theme' : 'Use dark theme'}
            aria-pressed={isDarkTheme}
            onClick={() => setIsDarkTheme((current) => !current)}
          >
            <MoonIcon size={18} />
          </button>
          <div className="relative max-sm:absolute max-sm:left-1/2 max-sm:top-1/2 max-sm:-translate-x-1/2 max-sm:-translate-y-1/2">
            <AdminNotifications />
          </div>
          <div className="relative" ref={profileMenuRef}>
            <button
              className="flex min-h-10 items-center gap-2 rounded-full border border-line bg-white px-1.5 py-1.5 text-left text-green-dark transition-colors hover:border-green/30 hover:bg-sage/30 disabled:cursor-wait disabled:opacity-60"
              type="button"
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              aria-label={`Open account menu for ${user.name}`}
              onClick={() => setIsProfileMenuOpen((current) => !current)}
              disabled={isLoggingOut}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sage text-xs font-bold text-green-dark">{profileInitial}</span>
              <span className="hidden max-w-28 truncate text-xs font-bold sm:block">{user.name}</span>
              <ChevronDownIcon className={`mr-1 shrink-0 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} size={15} />
            </button>
            {isProfileMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-64 overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-xl" role="menu" aria-label="Account menu">
                <div className="border-b border-line px-3 py-2.5">
                  <p className="truncate text-sm font-bold text-green-dark">{user.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>
                </div>
                <Link
                  className="mt-2 flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold text-green-dark transition-colors hover:bg-sage/45"
                  to="/admin/settings"
                  role="menuitem"
                  onClick={() => setIsProfileMenuOpen(false)}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}