import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { CartIcon, CloseIcon } from '../../assets/icons'
import { useCart } from '../../hooks/useCart'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { cartItemLineKey } from '../../context/cartContext'
import { useToast } from '../ui/Toast'
import { formatPrice } from '../../utils/formatPrice'
import { lockBodyScroll } from '../../utils/browserCompatibility'
import { optimizedImageUrl } from '../../utils/optimizedImageUrl'
import { ProductOptionSelector } from './ProductOptionSelector'
import type { Product } from '../../types/product'

interface ProductOptionsModalProps {
  product: Product
  onClose: () => void
}

export function ProductOptionsModal({ product, onClose }: ProductOptionsModalProps) {
  const options = [...(product.options ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
  const { addToCart, pendingItemIds } = useCart()
  const { user, shoppingMode } = useCustomerAuth()
  const { showToast } = useToast()
  const isWholesaleShopper = user?.role === 'CUSTOMER' && shoppingMode === 'WHOLESALE'

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(() => {
    if (options.length === 0) return null
    return (options.find((option) => option.stockQuantity > 0) ?? options[0]).id
  })
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    const releaseBodyScroll = lockBodyScroll()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      releaseBodyScroll()
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  const hasOptions = options.length > 0
  const selectedOption = hasOptions ? (options.find((option) => option.id === selectedOptionId) ?? null) : null
  const availableStock = hasOptions ? (selectedOption?.stockQuantity ?? 0) : product.stockQuantity
  const maxSelectableQuantity = Math.max(1, availableStock)
  const wholesaleMoq = isWholesaleShopper ? (selectedOption?.wholesaleMoq ?? null) : null
  const quantityFloor = wholesaleMoq ? Math.max(1, Math.min(wholesaleMoq, maxSelectableQuantity)) : 1
  const selectedQuantity = Math.max(quantityFloor, Math.min(quantity, maxSelectableQuantity))
  const isUnavailable = product.isAvailable === false || (hasOptions && (selectedOption === null || selectedOption.stockQuantity <= 0))
  const canAddToCart = !isUnavailable
  const isAdding = pendingItemIds.includes(cartItemLineKey(product.id, selectedOption?.id ?? null))

  const handleAddToCart = async () => {
    if (!canAddToCart) return
    try {
      await addToCart(product, selectedQuantity, selectedOption)
      showToast(`${product.name} added to your cart.`, 'success')
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'This product could not be added to your cart.', 'error')
    }
  }

  const productPath = `/product/${product.slug ?? product.id}`
  const displayPrice = hasOptions ? (selectedOption?.price ?? product.discountedPrice) : product.discountedPrice
  const unitLabel = hasOptions ? (selectedOption?.label ?? product.unit) : product.unit

  return createPortal(
    <div
      className="safe-modal-backdrop y-scrollbar fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-green-dark/45 px-4 py-8"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="product-options-panel w-full max-w-md rounded-2xl border border-line bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Select options for ${product.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-line p-5">
          {product.image ? (
            <img className="size-16 shrink-0 rounded-xl object-cover" src={optimizedImageUrl(product.image, 240)} alt={product.name} />
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-sage px-2 text-center text-[10px] font-semibold text-muted">Image unavailable</span>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-orange">{product.unit}</p>
            <h2 className="truncate text-base font-bold text-green-dark">{product.name}</h2>
            <p className="mt-1 text-sm font-bold text-green-dark">
              {formatPrice(displayPrice)}
              <span className="ml-1 font-normal text-muted">per {unitLabel}</span>
            </p>
          </div>
          <button
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-cream/50 text-muted transition-colors hover:bg-sage/40 hover:text-green-dark"
            type="button"
            aria-label="Close option picker"
            onClick={onClose}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {hasOptions && (
            <ProductOptionSelector
              options={options}
              selectedOptionId={selectedOption?.id ?? null}
              onSelect={setSelectedOptionId}
            />
          )}

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor="product-options-quantity">
              Quantity{wholesaleMoq ? ` · MOQ ${wholesaleMoq} units` : ''}
            </label>
            <div className="flex h-12 items-center justify-between rounded-xl border border-line bg-white px-1">
              <button
                className="grid size-11 place-items-center text-xl text-muted transition-colors hover:text-green disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                aria-label="Decrease quantity"
                disabled={selectedQuantity === quantityFloor || !canAddToCart}
                onClick={() => setQuantity((current) => Math.min(maxSelectableQuantity, Math.max(quantityFloor, current - 1)))}
              >
                −
              </button>
              <output className="min-w-9 text-center text-sm font-bold text-green-dark" id="product-options-quantity" aria-live="polite">
                {selectedQuantity}
              </output>
              <button
                className="grid size-11 place-items-center text-xl text-muted transition-colors hover:text-green disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                aria-label="Increase quantity"
                disabled={!canAddToCart || selectedQuantity >= maxSelectableQuantity}
                onClick={() => setQuantity((current) => Math.min(maxSelectableQuantity, Math.max(quantityFloor, current + 1)))}
              >
                +
              </button>
            </div>
            <p className="mt-2 text-xs text-muted" role="status" aria-live="polite">
              {isUnavailable
                ? 'This option is currently out of stock.'
                : `${availableStock} ${availableStock === 1 ? 'unit' : 'units'} available`}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line p-5">
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green px-6 text-sm font-bold text-cream shadow-lg shadow-green/15 transition-colors hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={!canAddToCart || isAdding}
            onClick={() => void handleAddToCart()}
            aria-label={`Add ${selectedQuantity} ${product.name} to cart`}
          >
            <CartIcon size={18} />
            {isAdding ? 'Adding…' : 'Add to cart'}
          </button>
          <Link
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line text-sm font-bold text-green-dark transition-colors hover:border-green/30 hover:bg-cream/50"
            to={productPath}
            onClick={onClose}
          >
            View full details
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  )
}