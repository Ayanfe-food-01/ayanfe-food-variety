import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductPrice } from './ProductPrice'
import { ProductRating } from './ProductRating'
import { WishlistButton } from './WishlistButton'
import type { Product } from '../../types/product'
import { useCart } from '../../hooks/useCart'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { cartItemLineKey } from '../../context/cartContext'
import { CartIcon } from '../../assets/icons'
import { useToast } from '../ui/Toast'
import { formatPrice } from '../../utils/formatPrice'
import { optimizedImageUrl } from '../../utils/optimizedImageUrl'
import { ProductOptionsModal } from './ProductOptionsModal'

interface ProductCardProps {
  product: Product
  variant?: 'full' | 'compact'
}

export function ProductCard({ product, variant = 'full' }: ProductCardProps) {
  const [imageError, setImageError] = useState(false)
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

  return (
    <article className={`product-card${variant === 'compact' ? ' product-card-quick-add' : ''}`}>
      <div className="product-image-wrap">
        <Link className="product-image-link" to={productUrl} aria-label={`View ${product.name}`}>
          {product.image && !imageError ? <img src={optimizedImageUrl(product.image, 480)} alt={`${product.name} - Ayanfe Food Variety`} loading="lazy" onError={() => setImageError(true)} /> : <span className="product-image-fallback">Image unavailable</span>}
        </Link>
        {discountPercent > 0 && <span className="product-discount-badge">-{discountPercent}%</span>}
      </div>
      <Link className="product-card-link" to={productUrl}>
        <div className="product-card-body">
          <span className="product-name">{product.name}</span>
          {showsWholesale ? (
            <strong className="product-price product-price-wholesale">
              <span className="wholesale-price-label">Wholesale from</span>
              <span className="wholesale-price-value">{formatPrice(wholesaleFrom)}</span>
            </strong>
          ) : (
            <div className="product-price-row">
              <strong className="product-price">
                <ProductPrice
                  originalPrice={product.price}
                  discountedPrice={product.discountedPrice}
                  discountedClassName="text-green-dark"
                  originalClassName="ml-1 text-sm font-normal text-muted"
                />
              </strong>
              <ProductRating rating={product.averageRating} count={product.reviewCount} />
            </div>
          )}
        </div>
      </Link>
      <WishlistButton product={product} className="product-card-wishlist" />
      {variant === 'compact' && (
        <button
          className="product-quick-add"
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
        <div className="product-card-actions">
        {isWholesaleShopper ? (
          <button
            className="product-card-add"
            type="button"
            onClick={() => setOptionsOpen(true)}
            aria-label={`Choose a wholesale package for ${product.name}`}
          >
            <CartIcon size={15} />
            Choose package
          </button>
        ) : hasOptions ? (
          <button
            className="product-card-add"
            type="button"
            onClick={() => setOptionsOpen(true)}
            aria-label={`Select options for ${product.name}`}
          >
            <CartIcon size={15} />
            Select options
          </button>
        ) : (
          <button
            className="product-card-add"
            type="button"
            disabled={!product.isAvailable || isAdding}
            onClick={() => void handleAddToCart()}
            aria-label={`Add ${product.name} to cart`}
          >
            <CartIcon size={15} />
            {isAdding ? 'Adding…' : product.isAvailable ? 'Add to cart' : 'Unavailable'}
          </button>
        )}
      </div>
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