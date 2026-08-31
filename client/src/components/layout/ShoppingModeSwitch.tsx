import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import type { ShoppingMode } from '../../services/authService'
import { ConfirmDialog } from '../ui/ConfirmDialog'

interface ShoppingModeSwitchProps {
  className?: string
}

export function ShoppingModeSwitch({ className = '' }: ShoppingModeSwitchProps) {
  const { user, isLoading, shoppingMode, switchShoppingMode, openAuth } = useCustomerAuth()
  const [isBusy, setIsBusy] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chooseMode = async (mode: ShoppingMode) => {
    if (isLoading || isBusy) return
    if (!user) {
      if (mode === 'WHOLESALE') setShowLoginPrompt(true)
      return
    }
    if (user.shoppingMode === mode) return
    setError(null)
    setIsBusy(true)
    try {
      await switchShoppingMode(mode)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Shopping mode could not be changed. Please try again.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <>
      <div className={`shopping-mode-switch${className ? ` ${className}` : ''}`}>
        <span className="shopping-mode-label">Shopping Mode</span>
        <div className="shopping-mode-toggle" role="group" aria-label="Shopping mode">
          <button
            className={`shopping-mode-option${shoppingMode === 'RETAIL' ? ' is-active' : ''}`}
            type="button"
            aria-pressed={shoppingMode === 'RETAIL'}
            disabled={isLoading || isBusy}
            onClick={() => void chooseMode('RETAIL')}
          >
            Retail
          </button>
          <button
            className={`shopping-mode-option${shoppingMode === 'WHOLESALE' ? ' is-active' : ''}`}
            type="button"
            aria-pressed={shoppingMode === 'WHOLESALE'}
            disabled={isLoading || isBusy}
            onClick={() => void chooseMode('WHOLESALE')}
          >
            Wholesale
          </button>
        </div>
        {error && <span className="shopping-mode-error" role="alert">{error}</span>}
      </div>
      {showLoginPrompt && createPortal(
        <ConfirmDialog
          eyebrow="Wholesale shopping"
          title="Sign in to shop wholesale"
          description="Wholesale shopping is open to every signed-in customer with no approval needed. Sign in or create an account to continue, or keep browsing in Retail mode as a guest."
          confirmLabel="Sign in or sign up"
          onCancel={() => setShowLoginPrompt(false)}
          onConfirm={() => {
            setShowLoginPrompt(false)
            openAuth(() => { void switchShoppingMode('WHOLESALE') })
          }}
        />,
        document.body,
      )}
    </>
  )
}