import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CartIcon, CloseIcon } from '../../assets/icons'
import type { CartItem } from '../../context/cartContext'
import { cartItemLineKey } from '../../context/cartContext'
import { useCart } from '../../hooks/useCart'
import { lockBodyScroll } from '../../utils/browserCompatibility'
import { ProductPrice } from '../products/ProductPrice'

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

function DrawerImage({ item }: { item: CartItem }) {
  const [imageError, setImageError] = useState(false)

  if (!item.image || imageError) {
    return (
      <div
        className="grid size-16 shrink-0 place-items-center rounded-xl bg-sage px-2 text-center text-[10px] font-semibold text-muted"
        role="img"
        aria-label={`${item.name} image unavailable`}
      >
        Image unavailable
      </div>
    )
  }

  return (
    <img
      className="size-16 shrink-0 rounded-xl object-cover"
      src={item.image}
      alt={item.name}
      loading="lazy"
      onError={() => setImageError(true)}
    />
  )
}

interface DrawerQuantityProps {
  item: CartItem
  disabled: boolean
  onDecrease: () => void
  onIncrease: () => void
}

function DrawerQuantity({ item, disabled, onDecrease, onIncrease }: DrawerQuantityProps) {
  return (
    <div className="flex h-8 w-fit items-center rounded-lg border border-line bg-cream" aria-label={`Quantity for ${item.name}`}>
      <button
        className="grid size-8 place-items-center text-base text-muted transition-colors hover:text-green disabled:cursor-not-allowed disabled:opacity-40"
        type="button"
        aria-label={`Decrease ${item.name} quantity`}
        disabled={disabled || item.quantity <= (item.minQuantity ?? 1)}
        onClick={onDecrease}
      >
        −
      </button>
      <output className="min-w-6 text-center text-sm font-bold text-green-dark" aria-live="polite">
        {item.quantity}
      </output>
      <button
        className="grid size-8 place-items-center text-base text-muted transition-colors hover:text-green disabled:cursor-not-allowed disabled:opacity-40"
        type="button"
        aria-label={`Increase ${item.name} quantity`}
        disabled={disabled || !item.isAvailable}
        onClick={onIncrease}
      >
        +
      </button>
    </div>
  )
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const {
    items,
    mode,
    subtotal,
    deliveryFee,
    total,
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
      const drawer = document.querySelector<HTMLElement>('.cart-drawer-panel')
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
    <div className={`cart-drawer ${open ? 'is-open' : 'is-closed'}`} data-open={open}>
      <div className="cart-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className="cart-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${mode === 'WHOLESALE' ? 'Wholesale' : 'Retail'} cart`}
        aria-hidden={!open}
        inert={!open}
      >
        <header className="cart-drawer-head">
          <div className="cart-drawer-title">
            <span className="cart-drawer-title-icon">
              <CartIcon size={17} />
            </span>
            <p className="cart-drawer-title-text">Your basket</p>
          </div>
          <span
            className={`cart-drawer-mode ${mode === 'WHOLESALE' ? 'is-wholesale' : ''}`}
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
          <div className="cart-drawer-state" aria-label="Loading cart">
            <div className="cart-drawer-state-icon">
              <CartIcon size={26} />
            </div>
            <p className="cart-drawer-state-title">Loading your cart…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="cart-drawer-state">
            <div className="cart-drawer-state-icon">
              <CartIcon size={26} />
            </div>
            <p className="cart-drawer-state-title">Your cart is empty</p>
            <p className="cart-drawer-state-text">
              Browse our carefully sourced foodstuff and add your everyday favourites to get started.
            </p>
            <Link className="cart-drawer-continue" to="/shop" onClick={onClose}>
              Continue shopping <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <>
            <ul className="cart-drawer-items" aria-label="Cart items">
              {items.map((item) => {
                const lineKey = cartItemLineKey(item.id, item.productOptionId)
                const isPending = pendingItemIds.includes(lineKey)
                const isBusy = isPending || isClearing
                return (
                  <li className="cart-drawer-item" key={lineKey}>
                    <DrawerImage item={item} />
                    <div className="cart-drawer-item-body">
                      <div className="cart-drawer-item-top">
                        <div className="cart-drawer-item-info">
                          <p className="cart-drawer-item-unit">{item.unit}</p>
                          <h3 className="cart-drawer-item-name">{item.name}</h3>
                          {item.productOptionLabel && (
                            <p className="cart-drawer-item-option">{item.productOptionLabel}</p>
                          )}
                          {typeof item.minQuantity === 'number' && item.minQuantity > 1 && (
                            <p className="cart-drawer-item-min">Minimum order: {item.minQuantity} units</p>
                          )}
                        </div>
                        <button
                          className="cart-drawer-remove"
                          type="button"
                          aria-label={`Remove ${item.name}${item.productOptionLabel ? ` (${item.productOptionLabel})` : ''} from cart`}
                          disabled={isBusy}
                          onClick={() => void removeFromCart(item)}
                        >
                          <CloseIcon size={14} />
                        </button>
                      </div>
                      {!item.isAvailable && (
                        <p className="cart-drawer-item-alert" role="alert">
                          {item.availabilityMessage ?? 'This item is unavailable.'}
                        </p>
                      )}
                      <div className="cart-drawer-item-bottom">
                        <DrawerQuantity
                          item={item}
                          disabled={isBusy}
                          onDecrease={() => void decreaseQuantity(item)}
                          onIncrease={() => void increaseQuantity(item)}
                        />
                        <div className="cart-drawer-item-price">
                          <p className="cart-drawer-item-price-each">
                            <ProductPrice
                              originalPrice={item.originalPrice}
                              discountedPrice={item.price}
                              discountedClassName="font-bold text-green-dark"
                              originalClassName="text-muted"
                            />{' '}
                            each
                          </p>
                          <p className="cart-drawer-item-subtotal">{formatPrice(getItemSubtotal(item))}</p>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            {error && (
              <div className="cart-drawer-error" role="alert">
                <span>{error}</span>
                <button type="button" onClick={() => void refreshCart()}>Refresh cart</button>
              </div>
            )}

            <footer className="cart-drawer-foot">
              <div className="cart-drawer-summary">
                <div className="cart-drawer-summary-row">
                  <span>Items</span>
                  <span>{totalQuantity}</span>
                </div>
                <div className="cart-drawer-summary-row">
                  <span>Subtotal</span>
                  <span className="cart-drawer-summary-strong">{formatPrice(subtotal)}</span>
                </div>
                <div className="cart-drawer-summary-row">
                  <span>Delivery fee</span>
                  <span className="cart-drawer-summary-strong">{deliveryFee === 0 ? 'Free' : formatPrice(deliveryFee)}</span>
                </div>
                <div className="cart-drawer-summary-total">
                  <span>Total</span>
                  <strong>{formatPrice(total)}</strong>
                </div>
              </div>
              {!canCheckout && (
                <p className="cart-drawer-notice" role="alert">
                  One or more items are no longer available in the requested quantity. Update or remove them before checkout.
                </p>
              )}
              {canCheckout ? (
                <Link className="cart-drawer-checkout" to="/checkout" onClick={onClose}>
                  Proceed to checkout <ArrowRight size={16} />
                </Link>
              ) : (
                <Link className="cart-drawer-checkout cart-drawer-checkout-is-disabled" to="/cart" onClick={onClose}>
                  Update cart to checkout
                </Link>
              )}
              <div className="cart-drawer-foot-links">
                <Link className="cart-drawer-foot-link" to="/cart" onClick={onClose}>
                  View cart
                </Link>
                <Link className="cart-drawer-foot-link" to="/shop" onClick={onClose}>
                  Continue shopping
                </Link>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}