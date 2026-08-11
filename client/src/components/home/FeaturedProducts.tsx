import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from '../../assets/icons'
import { ProductGrid } from '../products/ProductGrid'
import { getProducts } from '../../services/productService'
import type { Product } from '../../types/product'

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadProducts = useCallback(async () => {
    try {
      setProducts(await getProducts())
      setError(false)
    } catch {
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProducts()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadProducts])

  const retryProducts = () => {
    setIsLoading(true)
    void loadProducts()
  }

  return (
    <section className="bg-cream py-20 lg:py-24" id="products">
      <div className="mx-auto w-[calc(100%-32px)] max-w-[1160px] md:w-[calc(100%-48px)]">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end md:gap-6">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange"><span className="inline-block size-2 rounded-full bg-orange" /> Customer favourites</div>
            <h2 className="m-0 text-4xl font-bold leading-tight tracking-[-0.04em] text-green-dark sm:text-5xl">Popular products</h2>
          </div>
          <Link className="inline-flex items-center gap-1 text-sm font-bold text-green transition-all duration-200 hover:gap-2" to="/shop">See the full collection <ArrowUpRight size={16} /></Link>
        </div>
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading products">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="h-[320px] animate-pulse rounded-2xl bg-sage" key={index} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-line bg-sage/30 px-6 py-10 text-center">
            <p className="m-0 text-sm text-muted">Products are temporarily unavailable.</p>
            <button
              className="mt-4 rounded-full bg-green px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
              type="button"
              onClick={retryProducts}
            >
              Try again
            </button>
          </div>
        ) : products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <div className="rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-10 text-center">
            <p className="m-0 text-sm text-muted">No products are available right now.</p>
          </div>
        )}
      </div>
    </section>
  )
}