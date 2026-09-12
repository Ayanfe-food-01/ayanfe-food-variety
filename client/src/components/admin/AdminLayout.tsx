import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { AdminHeader } from './AdminHeader'
import { logoutAdmin, type AuthenticatedUser } from '../../services/authService'

const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed'

interface AdminLayoutProps {
  children: ReactNode
  user: AuthenticatedUser
}

export function AdminLayout({ children, user }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1',
  )
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
      navigate('/admin/login', { replace: true })
    }
  }

  const toggleCollapse = () => {
    setIsSidebarCollapsed((current) => {
      const next = !current
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <div className="min-h-screen bg-cream">
      <Sidebar
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onClose={() => setIsSidebarOpen(false)}
        onToggleCollapse={toggleCollapse}
      />
      <div className={`admin-main min-w-0 ${isSidebarCollapsed ? 'xl:pl-[84px]' : 'xl:pl-72'}`}>
        <AdminHeader
          isLoggingOut={isLoggingOut}
          onLogout={() => void logout()}
          onOpenNavigation={() => setIsSidebarOpen(true)}
          user={user}
        />
        <main className="px-5 py-7 sm:px-8 sm:py-9 xl:px-10 xl:py-10">
          <div className="mx-auto w-full max-w-[1440px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}