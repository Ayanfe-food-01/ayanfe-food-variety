import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
import { ApiError } from '../../services/api'
import { getCurrentAdmin, type AuthenticatedUser } from '../../services/authService'
import { AdminLayout } from './AdminLayout'

interface RequireAdminProps {
  children: ReactNode
}

const adminLoginRedirect = (location: ReturnType<typeof useLocation>) => ({
  pathname: '/admin/login',
  search: '',
  hash: '',
  state: { from: `${location.pathname}${location.search}${location.hash}` },
})

export function RequireAdmin({ children }: RequireAdminProps) {
  const location = useLocation()
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useInitialRouteLoad(!isChecking)

  const verify = useCallback(() => {
    let isCurrent = true
    setUser(null)
    setIsChecking(true)
    getCurrentAdmin()
      .then((currentUser) => {
        if (isCurrent) setUser(currentUser)
      })
      .catch((error: unknown) => {
        if (isCurrent && !(error instanceof ApiError && error.status === 401)) {
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

  useEffect(() => verify(), [verify])

  // When an admin tab regains focus (e.g. returning to the laptop), re-check the
  // server session so an expired session is caught without waiting for a request.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') verify()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [verify])

  if (isChecking) {
    return null
  }

  if (!user || user.role !== 'ADMIN') {
    return <Navigate replace to={adminLoginRedirect(location)} />
  }

  return <AdminLayout user={user}>{children}</AdminLayout>
}