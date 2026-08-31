import { useContext } from 'react'
import { MarketUiContext } from '../context/marketUiContext'

export function useMarketUi() {
  const context = useContext(MarketUiContext)

  if (!context) {
    throw new Error('useMarketUi must be used within a MarketUiProvider')
  }

  return context
}