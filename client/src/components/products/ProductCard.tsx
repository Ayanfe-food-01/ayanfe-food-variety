import type { Product } from '../../types/product'
import { BagIcon, EyeIcon } from '../../assets/icons'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Button } from '../ui/Button'
import { useCart } from '../../hooks/useCart'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { useToast } from '../ui/Toast'

interface ProductCardProps {
  product: Product
  showDetails?: boolean
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(price)

export function ProductCard({ product, showDetails = false }: ProductCardProps) {
  const [imageError, setImageError] = useState(false)
  const { addToCart, pendingItemIds } = useCart()
  const { user, openAuth } = useCustomerAuth()
  const { showToast } = useToast()

  const addProductToCart = async () => {
    try {
      await addToCart(product)
      showToast(`${product.name} added to your cart.`, 'success')
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'This product could not be added to your cart.', 'error')
    }
  }

  const handleAddToCart = () => {
    if (!user) {
      openAuth(addProductToCart)
      return
    }
    addProductToCart()
  }

  const isAdding = pendingItemIds.includes(product.id)

  return (
    <article className="group overflow-hidden rounded-2xl border border-line bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-green/10">
      <div className="relative aspect-[1.08] overflow-hidden bg-sage">
        {product.image && !imageError ? (
          <img
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            src={product.image}
            alt={product.name}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center px-6 text-center text-sm font-semibold text-muted" role="img" aria-label={`${product.name} image unavailable`}>
            Image unavailable
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-orange">{product.category}</div>
        <h3 className="m-0 text-lg font-bold text-green-dark">{product.name}</h3>
        <div className="mt-3 flex items-end justify-between gap-2 text-sm text-muted">
          <span>{product.unit}</span>
          <strong className="text-base text-green-dark">{formatPrice(product.price)}</strong>
        </div>
        <p className="mt-3 text-xs font-semibold text-muted">
          {product.availabilityStatus === 'LOW_STOCK' ? 'Low stock' : product.availabilityStatus === 'IN_STOCK' ? 'In stock' : 'Out of stock'}
        </p>
        <div className={`mt-5 flex items-center gap-2 ${showDetails ? '' : 'w-full'}`}>
          {product.isAvailable ? (
            <Button
              className={showDetails ? 'flex-1' : ''}
              fullWidth={!showDetails}
              variant="outline"
              onClick={handleAddToCart}
              disabled={isAdding}
              aria-label={`Add ${product.name} to cart`}
            >
              <BagIcon size={16} /> {isAdding ? 'Adding…' : 'Add to cart'}
            </Button>
          ) : (
            <p className={`${showDetails ? 'flex-1' : 'w-full'} rounded-xl bg-sage/50 py-3 text-center text-sm font-bold text-muted`}>Out of stock</p>
          )}
          {showDetails && (
            <Link
              className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl border border-green/20 text-green transition-colors duration-200 hover:bg-green hover:text-cream"
              to={`/product/${product.id}`}
              aria-label={`View details for ${product.name}`}
              title="View details"
            >
              <EyeIcon size={18} />
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}