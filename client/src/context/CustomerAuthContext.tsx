import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ApiError } from '../services/api'
import {
  getCurrentCustomer,
  logoutCustomer,
  type CustomerUser,
} from '../services/authService'
import { CustomerAuthContext, type AuthAction, type CustomerAuthContextValue } from './customerAuthContext'
import { CustomerAuthModal } from '../components/customer/CustomerAuthModal'

interface CustomerAuthProviderProps {
  children: ReactNode
}

export function CustomerAuthProvider({ children }: CustomerAuthProviderProps) {
  const [user, setUser] = useState<CustomerUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [afterAuth, setAfterAuth] = useState<AuthAction | undefined>()

  useEffect(() => {
    let isCurrent = true
    getCurrentCustomer()
      .then((currentUser) => {
        if (isCurrent) setUser(currentUser)
      })
      .catch((error: unknown) => {
        if (isCurrent && !(error instanceof ApiError && error.status === 401)) setUser(null)
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  const openAuth = useCallback((action?: AuthAction) => {
    setAfterAuth(() => action)
    setIsModalOpen(true)
  }, [])

  const closeAuth = useCallback(() => {
    setIsModalOpen(false)
    setAfterAuth(undefined)
  }, [])

  const handleAuthenticated = useCallback((authenticatedUser: CustomerUser) => {
    setUser(authenticatedUser)
    setIsModalOpen(false)
    const action = afterAuth
    setAfterAuth(undefined)
    action?.()
  }, [afterAuth])

  const logout = useCallback(async () => {
    try {
      await logoutCustomer()
    } finally {
      setUser(null)
    }
  }, [])

  const value: CustomerAuthContextValue = {
    user,
    isLoading,
    isModalOpen,
    openAuth,
    closeAuth,
    setUser,
    logout,
  }

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
      {isModalOpen && (
        <CustomerAuthModal
          onClose={closeAuth}
          onAuthenticated={handleAuthenticated}
        />
      )}
    </CustomerAuthContext.Provider>
  )
}