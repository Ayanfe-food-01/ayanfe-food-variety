import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CartIcon, EyeIcon } from '../../assets/icons'
import { useCart } from '../../hooks/useCart'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { useToast } from '../ui/Toast'
import { Button } from '../ui/Button'
import { ProductPrice } from './ProductPrice'
import type { Product } from '../../types/product'
import { WishlistButton } from './WishlistButton'

interface ProductCardProps {
  product: Product
  showDetails?: boolean
  compact?: boolean
}

export function ProductCard({ product, showDetails = false, compact = false }: ProductCardProps) {
  const [imageError, setImageError] = useState(false)
  const { addToCart, pendingItemIds } = useCart()
  const { user, openAuth } = useCustomerAuth()
  const { showToast } = useToast()
  const isAdding = pendingItemIds.includes(product.id)

  const addProduct = async () => {
    try {
      await addToCart(product)
      showToast(`${product.name} added to your cart.`, 'success')
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'This product could not be added to your cart.', 'error')
    }
  }

  const handleAddToCart = () => user ? void addProduct() : openAuth(() => void addProduct())
  const cardClass = compact ? 'product-card product-card-compact' : 'product-card'

  return (
    <article className={cardClass}>
      <div className="product-image-wrap">
        <Link className="product-image-link" to={`/product/${product.slug ?? product.id}`} aria-label={`View ${product.name}`}>
          {product.image && !imageError ? <img src={product.image} alt={`${product.name} - Ayanfe Food Variety`} loading="lazy" onError={() => setImageError(true)} /> : <span className="product-image-fallback">Image unavailable</span>}
          {product.availabilityStatus === 'LOW_STOCK' && <span className="product-badge">Low stock</span>}
        </Link>
        <WishlistButton product={product} />
      </div>
      <div className="product-card-body">
        <p className="product-category">{product.category}</p>
        <Link className="product-name" to={`/product/${product.slug ?? product.id}`}>{product.name}</Link>
        <span className="product-unit">{product.unit}</span>
        <strong className="product-price">
          <ProductPrice
            originalPrice={product.price}
            discountedPrice={product.discountedPrice}
            discountedClassName="text-green-dark"
            originalClassName="ml-1 text-sm font-normal text-muted"
          />
        </strong>
        {!compact && <div className="product-actions">
           {product.isAvailable ? <Button className="product-add-button" size="sm" fullWidth={!showDetails} variant="primary" onClick={handleAddToCart} disabled={isAdding}><CartIcon size={15} /> {isAdding ? 'Adding…' : 'Add to cart'}</Button> : <p className="out-of-stock">{product.isActive ? 'Out of stock' : 'Unavailable'}</p>}
           <div className="product-card-action-tools">
             {showDetails && <Link className="details-button" to={`/product/${product.slug ?? product.id}`} aria-label={`View details for ${product.name}`}><EyeIcon size={17} /></Link>}
           </div>
        </div>}
      </div>
    </article>
  )
}