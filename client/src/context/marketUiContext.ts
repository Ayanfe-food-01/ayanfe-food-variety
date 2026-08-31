import { createContext } from 'react'

export interface MarketUiContextValue {
  isCartDrawerOpen: boolean
  openCartDrawer: () => void
  closeCartDrawer: () => void
}

export const MarketUiContext = createContext<MarketUiContextValue | undefined>(undefined)