import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductPrice } from './ProductPrice'
import type { Product } from '../../types/product'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const [imageError, setImageError] = useState(false)

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
    </article>
  )
}