import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductPrice } from './ProductPrice'
import { WishlistButton } from './WishlistButton'
import type { Product } from '../../types/product'
import { useCart } from '../../hooks/useCart'
import { cartItemLineKey } from '../../context/cartContext'
import { CartIcon } from '../../assets/icons'
import { useToast } from '../ui/Toast'
import { optimizedImageUrl } from '../../utils/optimizedImageUrl'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const [imageError, setImageError] = useState(false)
  const { addToCart, pendingItemIds } = useCart()
  const { showToast } = useToast()
  const isAdding = pendingItemIds.includes(cartItemLineKey(product.id, null))

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
        {product.options && product.options.length > 0 ? (
          <Link
            className="product-card-add"
            to={`/product/${product.slug ?? product.id}`}
            aria-label={`Choose a size or quantity for ${product.name}`}
          >
            <CartIcon size={15} />
            Choose size
          </Link>
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
    </article>
  )
}