import { useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '../../types/product'
import { ArrowRight } from '../../assets/icons'
import { ProductCard } from '../products/ProductCard'
import { HorizontalRailControls } from '../ui/HorizontalRailControls'

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
  headingId?: string
}

export function ProductRail({
  title,
  eyebrow,
  products,
  isLoading,
  hasError,
  onRetry,
  href = '/shop',
  tone = 'cream',
  hideWhenEmpty = false,
  headingId,
}: ProductRailProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const resolvedHeadingId = headingId ?? `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-heading`

  if (hideWhenEmpty && !isLoading && !hasError && products.length === 0) return null

  return (
    <section className={`home-section product-section product-section-${tone}`} aria-labelledby={resolvedHeadingId}>
      <div className="container">
        <div className={`home-section-heading ${tone === 'yellow' ? 'home-section-heading-accent' : ''}`}>
          <div><p className="eyebrow">{eyebrow}</p><h2 id={resolvedHeadingId}>{title}</h2></div>
          <div className="home-section-heading-actions">
            <Link className="section-link" to={href}>See all <ArrowRight size={16} /></Link>
          </div>
        </div>
        {isLoading ? <ProductSkeleton /> : hasError ? (
          <div className="section-message" role="alert">
            <span>We couldn’t load this shelf.</span>
            <button type="button" className="border-0 bg-transparent text-orange font-extrabold cursor-pointer" onClick={onRetry}>Try again</button>
          </div>
        ) : products.length ? (
          <div className="horizontal-rail-frame">
            <div className="product-rail rail-scroll" ref={railRef}>
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            <HorizontalRailControls railRef={railRef} label={title} />
          </div>
        ) : <div className="section-message">No products are available on this shelf yet.</div>}
      </div>
    </section>
  )
}

function ProductSkeleton() {
  return (
    <div className="product-rail rail-scroll" aria-label="Loading products" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="product-skeleton" key={index} role="status" aria-label="Loading product">
          <div className="product-skeleton-media" />
          <div className="product-skeleton-body">
            <div className="product-skeleton-line" />
            <div className="product-skeleton-line" />
          </div>
          <div className="product-skeleton-action" />
        </div>
      ))}
    </div>
  )
}