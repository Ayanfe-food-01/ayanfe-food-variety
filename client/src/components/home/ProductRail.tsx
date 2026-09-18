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
  imagePriority?: boolean
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
  imagePriority = false,
}: ProductRailProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const resolvedHeadingId = headingId ?? `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-heading`
  const isAccent = tone === 'yellow'

  if (hideWhenEmpty && !isLoading && !hasError && products.length === 0) return null

  return (
    <section className="border-b border-line bg-white py-[25px] md:py-8" aria-labelledby={resolvedHeadingId}>
      <div className="container">
        <div className={`mb-4 flex items-center justify-between gap-[18px] ${isAccent ? 'w-screen max-w-none -ml-[calc(50vw-50%)] mb-5 bg-green-dark py-4 [padding-inline:max(24px,calc((100vw-1160px)/2))] rounded-none' : ''}`}>
          <div>
            <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.15em] text-orange">{eyebrow}</p>
            <h2 id={resolvedHeadingId} className={`m-0 tracking-[-0.035em] text-[clamp(1.35rem,3vw,1.8rem)] ${isAccent ? 'text-cream' : 'text-green-dark'}`}>{title}</h2>
          </div>
          <div className="flex items-center gap-2.5 md:gap-4">
            <Link className={`inline-flex items-center gap-[5px] whitespace-nowrap text-[12px] font-extrabold transition-colors ${isAccent ? 'text-cream hover:text-orange!' : 'text-green hover:text-orange'}`} to={href}>See all <ArrowRight size={16} /></Link>
          </div>
        </div>
        {isLoading ? <ProductSkeleton /> : hasError ? (
          <div className="flex min-h-[100px] items-center justify-center gap-[13px] rounded-xl border border-dashed border-green px-6 text-[13px] text-muted" role="alert">
            <span>We couldn't load this shelf.</span>
            <button type="button" className="cursor-pointer border-0 bg-transparent font-extrabold text-orange" onClick={onRetry}>Try again</button>
          </div>
        ) : products.length ? (
          <div className="relative">
            <div
className="flex items-stretch gap-3.5 overflow-x-auto pb-[18px] [scrollbar-gutter:stable] x-scrollbar md:gap-4 md:pb-0"
              ref={railRef}
              style={{ scrollbarGutter: undefined }}
            >
              {products.map((product, index) => (
                <div className="flex min-w-0 flex-[0_0_min(40vw,200px)] md:flex-[0_0_clamp(220px,calc((100%-48px)/4),290px)]" key={product.id}>
                  <ProductCard product={product} variant="compact" imagePriority={imagePriority && index < 6} />
                </div>
              ))}
            </div>
            <HorizontalRailControls railRef={railRef} label={title} />
          </div>
        ) : <div className="flex min-h-[100px] items-center justify-center gap-[13px] rounded-xl border border-dashed border-green px-6 text-[13px] text-muted">No products are available on this shelf yet.</div>}
      </div>
    </section>
  )
}

function ProductSkeleton() {
  return (
    <div className="flex items-stretch gap-3.5 overflow-x-auto pb-[18px] [scrollbar-gutter:stable] x-scrollbar md:gap-4 md:pb-0" aria-label="Loading products" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          className="flex min-w-0 flex-col overflow-hidden rounded-[10px] border border-line bg-white flex-[0_0_min(40vw,200px)] md:flex-[0_0_clamp(220px,calc((100%-48px)/4),290px)]"
          key={index}
          role="status"
          aria-label="Loading product"
        >
          <div className="aspect-square w-full animate-pulse bg-sage" />
          <div className="grid flex-1 gap-[9px] p-[11px]">
            <div className="h-3 animate-pulse rounded bg-sage" />
            <div className="h-3 w-[62%] animate-pulse rounded bg-sage" />
          </div>
          <div className="mx-[11px] mb-[11px] h-9 animate-pulse rounded-[9px] bg-sage" />
        </div>
      ))}
    </div>
  )
}
