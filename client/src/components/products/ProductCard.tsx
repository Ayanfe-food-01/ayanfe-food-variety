import type { Product } from '../../types/product'
import { BagIcon } from '../../assets/icons'
import { Link } from 'react-router-dom'
import { useCart } from '../../hooks/useCart'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'

interface ProductCardProps {
  product: Product
  showDetails?: boolean
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(price)

export function ProductCard({ product, showDetails = false }: ProductCardProps) {
  const { addToCart } = useCart()
  const { user, openAuth } = useCustomerAuth()

  const handleAddToCart = () => {
    if (!user) {
      openAuth(() => addToCart(product))
      return
    }
    addToCart(product)
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-line bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-green/10">
      <div className="relative aspect-[1.08] overflow-hidden bg-sage">
        <img className="size-full object-cover transition-transform duration-500 group-hover:scale-105" src={product.image} alt={product.name} />
        <span className="absolute left-3 top-3 rounded-full bg-orange px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-cream">Popular</span>
      </div>
      <div className="p-5">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-orange">{product.category}</div>
        <h3 className="m-0 text-lg font-bold text-green-dark">{product.name}</h3>
        <div className="mt-3 flex items-end justify-between gap-2 text-sm text-muted">
          <span>{product.unit}</span>
          <strong className="text-base text-green-dark">{formatPrice(product.price)}</strong>
        </div>
        <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-green/20 bg-transparent py-3 text-sm font-bold text-green transition-colors duration-200 hover:bg-green hover:text-cream" type="button" onClick={handleAddToCart} aria-label={`Add ${product.name} to cart`}>
          <BagIcon size={16} /> Add to cart
        </button>
        {showDetails && (
          <Link className="mt-3 inline-flex w-full items-center justify-center text-sm font-bold text-muted transition-colors hover:text-green" to={`/product/${product.id}`}>
            View details
          </Link>
        )}
      </div>
    </article>
  )
}