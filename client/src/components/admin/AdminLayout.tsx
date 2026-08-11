import { useState, type ReactNode } from 'react'
import { MenuIcon } from '../../assets/icons'
import { Sidebar } from './Sidebar'
import { logoutAdmin } from '../../services/authService'
import { useNavigate } from 'react-router-dom'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const logout = async () => {
    try {
      await logoutAdmin()
    } catch {
      // Redirect even if the API is unavailable; the session is not retained in the client.
    } finally {
      navigate('/login', { replace: true })
    }
  }

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
            <button className="rounded-full border border-line bg-sage px-3 py-2 text-xs font-bold text-green-dark hover:bg-white" type="button" onClick={() => void logout()}>Log out</button>
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