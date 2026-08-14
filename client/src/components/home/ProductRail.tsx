import { Link } from 'react-router-dom'
import type { Product } from '../../types/product'
import { ArrowRight } from '../../assets/icons'
import { ProductCard } from '../products/ProductCard'

interface ProductRailProps {
  title: string
  eyebrow: string
  products: Product[]
  isLoading: boolean
  hasError: boolean
  onRetry: () => void
  href?: string
  tone?: 'cream' | 'yellow'
  hideWhenEmpty?: boolean
}

export function ProductRail({ title, eyebrow, products, isLoading, hasError, onRetry, href = '/shop', tone = 'cream', hideWhenEmpty = false }: ProductRailProps) {
  if (hideWhenEmpty && !isLoading && !hasError && products.length === 0) return null

  return (
    <section className={`home-section product-section product-section-${tone}`} aria-labelledby={`${title}-heading`}>
      <div className="container">
        <div className={`home-section-heading ${tone === 'yellow' ? 'home-section-heading-accent' : ''}`}>
          <div><p className="eyebrow">{eyebrow}</p><h2 id={`${title}-heading`}>{title}</h2></div>
          <Link className="section-link" to={href}>See all <ArrowRight size={16} /></Link>
        </div>
        {isLoading ? <ProductSkeleton /> : hasError ? (
          <div className="section-message" role="alert">
            <span>We couldn’t load this shelf.</span>
            <button type="button" onClick={onRetry}>Try again</button>
          </div>
        ) : products.length ? (
          <div className="product-rail">
            {products.map((product) => <ProductCard key={product.id} product={product} compact />)}
          </div>
        ) : <div className="section-message">No products are available on this shelf yet.</div>}
      </div>
    </section>
  )
}

function ProductSkeleton() {
  return <div className="product-rail" aria-label="Loading products" aria-busy="true">
    {Array.from({ length: 4 }, (_, index) => <div className="product-skeleton" key={index} />)}
  </div>
}