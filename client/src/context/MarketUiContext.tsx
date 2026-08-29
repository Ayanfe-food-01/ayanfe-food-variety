import { useState, type ReactNode } from 'react'
import { MarketUiContext, type MarketUiContextValue } from './marketUiContext'

export function MarketUiProvider({ children }: { children: ReactNode }) {
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false)

  const value: MarketUiContextValue = {
    isCartDrawerOpen,
    openCartDrawer: () => setIsCartDrawerOpen(true),
    closeCartDrawer: () => setIsCartDrawerOpen(false),
  }

  return <MarketUiContext.Provider value={value}>{children}</MarketUiContext.Provider>
}