import { useEffect, useRef } from 'react'
import { CartIcon, CloseIcon } from '../../assets/icons'
import { cartItemLineKey } from '../../context/cartContext'
import { useCart } from '../../hooks/useCart'
import { lockBodyScroll } from '../../utils/browserCompatibility'
import { CartDrawerItem } from './CartDrawerItem'
import { CartDrawerFooter } from './CartDrawerFooter'
import { CartDrawerLoading, CartDrawerEmpty, CartDrawerError } from './CartDrawerState'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price)

const FOCUSABLE_SELECTOR = 'a, button, input, [tabindex]:not([tabindex="-1"])'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const {
    items,
    mode,
    subtotal,
    totalQuantity,
    canCheckout,
    isLoading,
    error,
    pendingItemIds,
    isClearing,
    refreshCart,
    getItemSubtotal,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
  } = useCart()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const releaseBodyScroll = lockBodyScroll()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const drawer = document.querySelector<HTMLElement>('[data-cart-panel]')
      if (!drawer) return
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute('disabled'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    return () => {
      releaseBodyScroll()
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [onClose, open])

  return (
    <div
      className={`fixed inset-0 z-80 grid place-items-center p-[max(1rem,env(safe-area-inset-top))_max(1rem,env(safe-area-inset-right))_max(1rem,env(safe-area-inset-bottom))_max(1rem,env(safe-area-inset-left))] pointer-events-none ${open ? 'motion-reduce:transition-none' : ''}`}
      data-open={open}
    >
      <div
        className={`fixed inset-0 bg-[#142116]/45 cursor-pointer pointer-events-auto motion-reduce:transition-none ${open ? 'opacity-100 visible transition-opacity duration-[280ms] ease-in' : 'opacity-0 invisible transition-[opacity_280ms_ease,visibility_0s_linear_280ms]'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="relative flex min-h-0 w-[min(560px,100%)] max-h-[calc(100svh-2rem)] flex-col overflow-hidden rounded-3xl border border-line bg-cream shadow-[0_24px_64px_rgb(20_33_22/0.28)] pointer-events-auto will-change-[transform,opacity] motion-reduce:transition-none"
        data-cart-panel=""
        role="dialog"
        aria-modal="true"
        aria-label={`${mode === 'WHOLESALE' ? 'Wholesale' : 'Retail'} cart`}
        aria-hidden={!open}
        inert={!open}
        style={{
          transform: open ? 'translateY(0)' : 'translateY(16px)',
          opacity: open ? 1 : 0,
          visibility: open ? 'visible' : 'hidden',
          transition: open
            ? 'opacity 280ms ease, transform 320ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 0s'
            : 'opacity 280ms ease, transform 320ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 320ms',
        }}
      >
        <header className="flex items-center gap-2.5 border-b border-line bg-card py-[14px] pr-[18px] pl-[max(18px,env(safe-area-inset-left))]">
          <div className="flex items-center gap-2">
            <span className="grid size-[30px] place-items-center rounded-full bg-sage text-green">
              <CartIcon size={17} />
            </span>
            <p className="m-0 text-[15px] font-extrabold tracking-[-0.01em] text-green-dark">Your basket</p>
          </div>
          <span
            className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] ${mode === 'WHOLESALE' ? 'bg-orange text-cream' : 'bg-sage text-muted'}`}
          >
            {mode === 'WHOLESALE' ? 'Wholesale' : 'Retail'}
          </span>
          <button
            ref={closeButtonRef}
            className="grid size-9 place-items-center rounded-full border border-line bg-transparent text-green-dark cursor-pointer transition-colors duration-200 hover:bg-sage hover:text-green"
            type="button"
            onClick={onClose}
            aria-label="Close cart"
          >
            <CloseIcon size={20} />
          </button>
        </header>

        {isLoading ? (
          <CartDrawerLoading />
        ) : items.length === 0 ? (
          <CartDrawerEmpty onClose={onClose} />
        ) : (
          <>
            <ul className="y-scrollbar flex min-h-0 flex-1 flex-col overscroll-contain m-0 list-none p-0" style={{ WebkitOverflowScrolling: 'touch' }} aria-label="Cart items">
              {items.map((item) => {
                const lineKey = cartItemLineKey(item.id, item.productOptionId, item.wholesalePackageId)
                const isPending = pendingItemIds.includes(lineKey)
                const isBusy = isPending || isClearing
                return (
                  <CartDrawerItem
                    key={lineKey}
                    item={item}
                    isBusy={isBusy}
                    subtotal={formatPrice(getItemSubtotal(item))}
                    onDecrease={() => void decreaseQuantity(item)}
                    onIncrease={() => void increaseQuantity(item)}
                    onRemove={() => void removeFromCart(item)}
                  />
                )
              })}
            </ul>

            {error && <CartDrawerError error={error} onRefresh={refreshCart} />}

            <CartDrawerFooter
              totalQuantity={totalQuantity}
              subtotalFormatted={formatPrice(subtotal)}
              canCheckout={canCheckout}
              onClose={onClose}
            />
          </>
        )}
      </aside>
    </div>
  )
}
