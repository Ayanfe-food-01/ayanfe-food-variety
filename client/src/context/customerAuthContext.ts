import { createContext } from 'react'
import type { AuthenticatedUser } from '../services/authService'

export type AuthAction = () => void

export interface CustomerAuthContextValue {
  user: AuthenticatedUser | null
  isLoading: boolean
  openAuth: (afterAuth?: AuthAction) => void
  completeAuthentication: (user: AuthenticatedUser) => void
  setUser: (user: AuthenticatedUser | null) => void
  logout: () => Promise<void>
}

export const CustomerAuthContext = createContext<CustomerAuthContextValue | undefined>(undefined)