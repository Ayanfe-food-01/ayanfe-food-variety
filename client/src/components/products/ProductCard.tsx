import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductPrice } from './ProductPrice'
import { WishlistButton } from './WishlistButton'
import type { Product } from '../../types/product'
import { useCart } from '../../hooks/useCart'
import { CartIcon } from '../../assets/icons'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const [imageError, setImageError] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const { addToCart, pendingItemIds } = useCart()
  const isAdding = pendingItemIds.includes(product.id)

  const handleAddToCart = async () => {
    setFeedback(null)
    try {
      await addToCart(product)
      setFeedback('Added to cart')
      window.setTimeout(() => setFeedback(null), 1800)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not add this product to cart.')
    }
  }

  return (
    <article className="product-card">
      <Link className="product-card-link" to={`/product/${product.slug ?? product.id}`} aria-label={`View ${product.name}`}>
        <div className="product-image-wrap">
          {product.image && !imageError ? <img src={product.image} alt={`${product.name} - Ayanfe Food Variety`} loading="lazy" onError={() => setImageError(true)} /> : <span className="product-image-fallback">Image unavailable</span>}
        </div>
        <div className="product-card-body">
          <span className="product-name">{product.name}</span>
          <strong className="product-price">
            <ProductPrice
              originalPrice={product.price}
              discountedPrice={product.discountedPrice}
              discountedClassName="text-green-dark"
              originalClassName="ml-1 text-sm font-normal text-muted"
            />
          </strong>
        </div>
      </Link>
      <WishlistButton product={product} className="product-card-wishlist" />
      <div className="product-card-actions">
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
        {feedback && <span className={`product-card-feedback ${feedback === 'Added to cart' ? 'is-success' : 'is-error'}`} role="status">{feedback}</span>}
      </div>
    </article>
  )
}