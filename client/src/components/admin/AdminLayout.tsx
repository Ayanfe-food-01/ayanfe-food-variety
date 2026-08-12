import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { AdminHeader } from './AdminHeader'
import { logoutAdmin } from '../../services/authService'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const navigate = useNavigate()

  const logout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    setIsSidebarOpen(false)
    try {
      await logoutAdmin()
    } catch {
      // Always leave the protected portal, even if the API is temporarily unavailable.
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-cream lg:flex">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onLogout={() => void logout()} />
      <div className="admin-main min-w-0 flex-1">
        <AdminHeader
          isLoggingOut={isLoggingOut}
          onLogout={() => void logout()}
          onOpenNavigation={() => setIsSidebarOpen(true)}
        />
        <main className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}