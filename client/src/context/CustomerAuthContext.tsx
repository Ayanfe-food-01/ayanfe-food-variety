import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../services/api'
import {
  getCurrentUser,
  logout as logoutUser,
  setShoppingMode,
  type AuthenticatedUser,
  type ShoppingMode,
} from '../services/authService'
import { CustomerAuthContext, type AuthAction, type CustomerAuthContextValue } from './customerAuthContext'
import { storeAuthReturnPath } from '../utils/authReturn'

interface CustomerAuthProviderProps {
  children: ReactNode
}

export function CustomerAuthProvider({ children }: CustomerAuthProviderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const afterAuthRef = useRef<AuthAction | undefined>(undefined)
  const userRef = useRef(user)

  userRef.current = user

  useEffect(() => {
    let isCurrent = true
    getCurrentUser()
      .then((currentUser) => {
        if (isCurrent) setUser(currentUser.role === 'CUSTOMER' ? currentUser : null)
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
    afterAuthRef.current = action
    const returnPath = `${location.pathname}${location.search}${location.hash}`
    storeAuthReturnPath(returnPath)
    navigate('/login', {
      state: {
        from: returnPath,
      },
    })
  }, [location.hash, location.pathname, location.search, navigate])

  const completeAuthentication = useCallback((authenticatedUser: AuthenticatedUser) => {
    const authenticated = authenticatedUser.role === 'CUSTOMER' ? authenticatedUser : null
    userRef.current = authenticated
    setUser(authenticated)
    const action = afterAuthRef.current
    afterAuthRef.current = undefined
    action?.()
  }, [])

  const completeGuestContinuation = useCallback(() => {
    const action = afterAuthRef.current
    afterAuthRef.current = undefined
    action?.()
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutUser()
    } finally {
      userRef.current = null
      setUser(null)
    }
  }, [])

  const switchShoppingMode = useCallback(async (mode: ShoppingMode) => {
    if (!userRef.current) {
      throw new Error('Sign in to shop wholesale.')
    }
    if (userRef.current.shoppingMode === mode) return
    const updatedUser = await setShoppingMode(mode)
    setUser(updatedUser.role === 'CUSTOMER' ? updatedUser : null)
  }, [])

  const value: CustomerAuthContextValue = {
    user,
    isLoading,
    shoppingMode: user?.shoppingMode ?? 'RETAIL',
    openAuth,
    completeAuthentication,
    completeGuestContinuation,
    setUser,
    switchShoppingMode,
    logout,
  }

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  )
}