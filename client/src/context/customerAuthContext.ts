import { createContext } from 'react'
import type { CustomerUser } from '../services/authService'

export type AuthAction = () => void

export interface CustomerAuthContextValue {
  user: CustomerUser | null
  isLoading: boolean
  isModalOpen: boolean
  openAuth: (afterAuth?: AuthAction) => void
  closeAuth: () => void
  setUser: (user: CustomerUser | null) => void
  logout: () => Promise<void>
}

export const CustomerAuthContext = createContext<CustomerAuthContextValue | undefined>(undefined)