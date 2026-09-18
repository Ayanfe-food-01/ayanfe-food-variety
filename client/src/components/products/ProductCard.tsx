import { useState } from 'react'
import { Link } from 'react-router-dom'
import { WishlistButton } from './WishlistButton'
import type { Product } from '../../types/product'
import { useCart } from '../../hooks/useCart'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { cartItemLineKey } from '../../context/cartContext'
import { CartIcon } from '../../assets/icons'
import { useToast } from '../ui/Toast'
import { ProductOptionsModal } from './ProductOptionsModal'
import { ProductCardImage } from './ProductCardImage'
import { ProductCardPricing } from './ProductCardPricing'
import { ProductCardActions } from './ProductCardActions'

interface ProductCardProps {
  product: Product
  variant?: 'full' | 'compact'
  imagePriority?: boolean
}

export function ProductCard({ product, variant = 'full', imagePriority = false }: ProductCardProps) {
  const [optionsOpen, setOptionsOpen] = useState(false)
  const { addToCart, pendingItemIds } = useCart()
  const { user, shoppingMode } = useCustomerAuth()
  const { showToast } = useToast()
  const isAdding = pendingItemIds.includes(cartItemLineKey(product.id, null))
  const isWholesaleShopper = user?.role === 'CUSTOMER' && shoppingMode === 'WHOLESALE'
  const wholesaleFrom = isWholesaleShopper ? product.wholesaleFrom : null
  const hasOptions = Boolean(product.options && product.options.length > 0)
  const showsWholesale = wholesaleFrom !== null && wholesaleFrom !== undefined
  const discountPercent = showsWholesale || !product.isAvailable || product.discountedPrice >= product.price || product.discountedPrice <= 0
    ? 0
    : Math.round((1 - product.discountedPrice / product.price) * 100)
  const productUrl = `/product/${product.slug ?? product.id}`

  const handleAddToCart = async () => {
    try {
      await addToCart(product)
      showToast(`${product.name} added to your cart.`, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not add this product to cart.', 'error')
    }
  }

  const handleQuickAdd = () => {
    if (isWholesaleShopper) {
      if (!showsWholesale) {
        showToast('No wholesale package is available for this product yet.', 'error')
        return
      }
      setOptionsOpen(true)
      return
    }
    if (hasOptions) {
      setOptionsOpen(true)
      return
    }
    void handleAddToCart()
  }

  const isCompact = variant === 'compact'

  return (
    <article className="relative flex min-w-0 flex-col overflow-hidden rounded-[10px] border border-line bg-white transition-[box-shadow,border-color,transform,translate] duration-200 hover:border-green/24 hover:shadow-[0_10px_24px_rgb(32_60_36/0.11)] hover:-translate-y-0.5">
      <ProductCardImage product={product} productUrl={productUrl} discountPercent={discountPercent} imagePriority={imagePriority} />
      <Link className={`flex min-w-0 flex-1 flex-col text-inherit ${isCompact ? 'pr-[50px]' : ''}`} to={productUrl}>
        <div className="grid min-w-0 flex-1 content-start gap-[3px] p-[9px_10px_11px] md:p-[10px_11px_12px]">
          <span className="line-clamp-2 min-h-0 text-[13px] font-bold leading-[1.3] text-ink hover:text-orange">{product.name}</span>
          <ProductCardPricing product={product} showsWholesale={showsWholesale} wholesaleFrom={wholesaleFrom ?? null} />
        </div>
      </Link>
      <WishlistButton product={product} className="absolute top-[9px] right-[9px] z-2 grid size-[30px] min-h-[30px] place-items-center border border-line bg-white text-green-dark shadow-[0_1px_4px_rgb(20_33_22/0.14)] hover:border-orange hover:bg-orange hover:text-white focus-visible:border-orange focus-visible:bg-orange focus-visible:text-white" />
      {isCompact && (
        <button
          className="absolute right-[10px] bottom-[10px] z-3 grid size-[34px] place-items-center rounded-full border-0 bg-green text-white shadow-[0_2px_10px_rgb(20_33_22/0.28)] cursor-pointer transition-[background-color,box-shadow,scale] duration-200 hover:bg-green-dark hover:scale-[1.06] hover:shadow-[0_4px_14px_rgb(20_33_22/0.32)] focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60 disabled:transform-none"
          type="button"
          aria-label={hasOptions ? `Select options for ${product.name}` : `Add ${product.name} to cart`}
          title={hasOptions ? 'Select options' : 'Add to cart'}
          disabled={isAdding}
          onClick={handleQuickAdd}
        >
          <CartIcon size={15} />
        </button>
      )}
      {variant === 'full' && (
        <ProductCardActions
          product={product}
          isWholesaleShopper={isWholesaleShopper}
          hasOptions={hasOptions}
          isAdding={isAdding}
          onAddToCart={() => void handleAddToCart()}
          onOpenOptions={() => setOptionsOpen(true)}
        />
      )}
      {optionsOpen && (
        <ProductOptionsModal
          product={product}
          mode={isWholesaleShopper ? 'wholesale' : 'retail'}
          onClose={() => setOptionsOpen(false)}
        />
      )}
    </article>
  )
}