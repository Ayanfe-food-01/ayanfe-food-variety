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
}

export function ProductCard({ product }: ProductCardProps) {
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

  const handleAddToCart = async () => {
    try {
      await addToCart(product)
      showToast(`${product.name} added to your cart.`, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not add this product to cart.', 'error')
    }
  }

  return (
    <article className="product-card">
      <Link className="product-card-link" to={`/product/${product.slug ?? product.id}`} aria-label={`View ${product.name}`}>
        <div className="product-image-wrap">
          {product.image && !imageError ? <img src={optimizedImageUrl(product.image, 480)} alt={`${product.name} - Ayanfe Food Variety`} loading="lazy" onError={() => setImageError(true)} /> : <span className="product-image-fallback">Image unavailable</span>}
          {discountPercent > 0 && <span className="product-discount-badge">-{discountPercent}%</span>}
        </div>
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
      <div className="product-card-actions">
        {hasOptions ? (
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
      {optionsOpen && <ProductOptionsModal product={product} onClose={() => setOptionsOpen(false)} />}
    </article>
  )
}