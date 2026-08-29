import { createContext } from 'react'
import type { AuthenticatedUser, ShoppingMode } from '../services/authService'

export type AuthAction = () => void

export interface CustomerAuthContextValue {
  user: AuthenticatedUser | null
  isLoading: boolean
  shoppingMode: ShoppingMode
  openAuth: (afterAuth?: AuthAction) => void
  completeAuthentication: (user: AuthenticatedUser) => void
  completeGuestContinuation: () => void
  setUser: (user: AuthenticatedUser | null) => void
  switchShoppingMode: (mode: ShoppingMode) => Promise<void>
  logout: () => Promise<void>
}

export const CustomerAuthContext = createContext<CustomerAuthContextValue | undefined>(undefined)