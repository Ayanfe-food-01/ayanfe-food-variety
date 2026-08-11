import { useState, type ReactNode } from 'react'
import { MenuIcon } from '../../assets/icons'
import { Sidebar } from './Sidebar'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-cream lg:flex">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between border-b border-line bg-cream/90 px-5 backdrop-blur-xl sm:px-8 lg:px-10">
          <button
            className="rounded-xl border border-line bg-white p-2 text-green-dark lg:hidden"
            type="button"
            aria-label="Open admin navigation"
            onClick={() => setIsSidebarOpen(true)}
          >
            <MenuIcon size={21} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted sm:inline">Store operations</span>
            <div
              className="grid size-10 place-items-center rounded-full border border-line bg-sage text-sm font-bold text-green-dark"
              role="img"
              aria-label="Admin profile image placeholder"
            >
              A
            </div>
          </div>
        </header>
        <main className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}