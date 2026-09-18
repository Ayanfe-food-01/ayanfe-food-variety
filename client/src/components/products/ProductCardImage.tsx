import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StoreStockBadge } from './StoreStockBadge'
import { optimizedImageUrl } from '../../utils/optimizedImageUrl'
import type { Product } from '../../types/product'

interface ProductCardImageProps {
  product: Product
  productUrl: string
  discountPercent: number
  imagePriority: boolean
}

export function ProductCardImage({ product, productUrl, discountPercent, imagePriority }: ProductCardImageProps) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="group relative aspect-square overflow-hidden bg-[#f4f4ef]">
      <Link className="block size-full text-inherit" to={productUrl} aria-label={`View ${product.name}`}>
        {product.image && !imageError ? (
          <img
            className="size-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
            src={optimizedImageUrl(product.image, 480)}
            alt={`${product.name} - Ayanfe Food Variety`}
            loading={imagePriority ? 'eager' : 'lazy'}
            fetchPriority={imagePriority ? 'high' : 'auto'}
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="grid size-full place-items-center text-[11px] text-muted">Image unavailable</span>
        )}
      </Link>
      {discountPercent > 0 && (
        <span className="absolute top-[10px] left-[10px] z-2 rounded-full bg-orange px-[9px] py-[5px] text-[11px] font-extrabold leading-none tracking-[0.02em] text-white">
          -{discountPercent}%
        </span>
      )}
      <StoreStockBadge product={product} className="absolute bottom-[10px] left-[10px] z-2" />
    </div>
  )
}
