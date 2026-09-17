import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import type { ShoppingMode } from '../../services/authService'
import { ApiError } from '../../services/api'
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
      const isAuthError = caught instanceof ApiError && caught.status === 401
      if (!isAuthError) {
        setError(caught instanceof Error ? caught.message : 'Shopping mode could not be changed. Please try again.')
      }
    } finally {
      setIsBusy(false)
    }
  }

  const isDesktop = className.includes('desktop-shopping-mode')
  const isMobile = className.includes('mobile-shopping-mode')
  const sizeClass = isDesktop ? 'min-h-[30px] px-[12px] text-[11px]' : isMobile ? 'flex-1 min-h-[42px] px-[10px] text-[12px]' : 'text-[11px]'
  const modeClass = (mode: ShoppingMode) =>
    `${sizeClass} ${shoppingMode === mode ? 'bg-green-dark text-cream hover:text-cream' : 'bg-transparent text-muted hover:text-green-dark'}`

  return (
    <>
      <div className={`inline-flex flex-col items-start gap-[3px]${isMobile ? ' w-full mb-[10px] pb-[14px]' : ''}${isDesktop ? ' md:flex-row md:items-center md:gap-[10px] md:mt-[10px] md:mb-[10px] md:mr-auto md:ml-0 md:pl-[10px] md:border-l md:border-line md:shrink-0 lg:pl-[14px]' : ''}${className ? ` ${className}` : ''}`}>
        <span className={`text-muted font-extrabold uppercase ${isDesktop ? 'text-[11px] tracking-[0.08em] whitespace-nowrap' : 'text-[9px] tracking-[0.1em]'}`}>Shopping Mode</span>
        <div className={`${isMobile ? 'flex w-full gap-[2px]' : 'inline-flex gap-[3px]'} items-center rounded-full border border-line bg-[#f0f1ee] p-[3px]`} role="group" aria-label="Shopping mode">
          <button
            className={`min-h-[32px] border-0 rounded-full px-[14px] font-extrabold whitespace-nowrap cursor-pointer transition-[background-color,color] duration-200 ease-[ease] focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60 ${modeClass('RETAIL')}`}
            type="button"
            aria-pressed={shoppingMode === 'RETAIL'}
            disabled={isLoading || isBusy}
            onClick={() => void chooseMode('RETAIL')}
          >
            Retail
          </button>
          <button
            className={`min-h-[32px] border-0 rounded-full px-[14px] font-extrabold whitespace-nowrap cursor-pointer transition-[background-color,color] duration-200 ease-[ease] focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60 ${modeClass('WHOLESALE')}`}
            type="button"
            aria-pressed={shoppingMode === 'WHOLESALE'}
            disabled={isLoading || isBusy}
            onClick={() => void chooseMode('WHOLESALE')}
          >
            Wholesale
          </button>
        </div>
        {error && <span className="text-orange text-[10px] font-bold" role="alert">{error}</span>}
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