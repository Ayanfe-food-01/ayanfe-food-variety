import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ApiError } from '../../services/api'
import { getCurrentAdmin, type AuthenticatedUser } from '../../services/authService'
import { AdminLayout } from './AdminLayout'

interface RequireAdminProps {
  children: ReactNode
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const location = useLocation()
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let isCurrent = true
    getCurrentAdmin()
      .then((currentUser) => {
        if (isCurrent) setUser(currentUser)
      })
      .catch((error: unknown) => {
        if (isCurrent && error instanceof ApiError && error.status !== 401) {
          setUser(null)
        }
      })
      .finally(() => {
        if (isCurrent) setIsChecking(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  if (isChecking) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream px-6">
        <p className="text-sm font-semibold text-muted">Checking administrator access…</p>
      </div>
    )
  }

  if (!user || user.role !== 'ADMIN') {
    return <Navigate replace to="/login" state={{ from: `${location.pathname}${location.search}${location.hash}` }} />
  }

  return <AdminLayout>{children}</AdminLayout>
}