import { useEffect, useState } from 'react'
import { BellIcon, GlobeIcon, MenuIcon, MoonIcon, SearchIcon } from '../../assets/icons'

interface AdminHeaderProps {
  isLoggingOut: boolean
  onLogout: () => void
  onOpenNavigation: () => void
}

export function AdminHeader({ isLoggingOut, onLogout, onOpenNavigation }: AdminHeaderProps) {
  const [isDarkTheme, setIsDarkTheme] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('admin-dark', isDarkTheme)
  }, [isDarkTheme])

  useEffect(() => () => {
    document.documentElement.classList.remove('admin-dark')
  }, [])

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-cream/90 px-4 backdrop-blur-xl sm:px-8 lg:px-10">
      <div className="flex min-h-[80px] items-center gap-3">
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
          <button
            className="relative grid size-10 place-items-center rounded-full border border-transparent bg-sage/45 text-green-dark transition-colors hover:border-line hover:bg-white"
            type="button"
            aria-label="View notifications"
          >
            <BellIcon size={18} />
            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-orange" aria-hidden="true" />
          </button>
          <button
            className="hidden size-10 place-items-center rounded-full border border-transparent bg-sage/45 text-green-dark transition-colors hover:border-line hover:bg-white sm:grid"
            type="button"
            aria-label="Language: English"
            title="Language: English"
          >
            <GlobeIcon size={18} />
          </button>
          <button
            className="grid size-10 place-items-center rounded-full border border-line bg-sage text-sm font-bold text-green-dark transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-60"
            type="button"
            aria-label="Log out of admin portal"
            onClick={onLogout}
            disabled={isLoggingOut}
          >
            A
          </button>
        </div>
      </div>
    </header>
  )
}