import { createContext } from 'react'

export interface RouteLoadContextValue {
  hold: () => void
  release: () => void
  beginNavigation: () => void
  isLoading: boolean
}

export const RouteLoadContext = createContext<RouteLoadContextValue | undefined>(undefined)
