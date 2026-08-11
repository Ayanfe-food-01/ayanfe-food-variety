import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { ProductGrid } from '../components/products/ProductGrid'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { getCategories } from '../services/categoryService'
import { getProducts } from '../services/productService'
import type { Category } from '../types/category'
import type { Product } from '../types/product'

export function Shop() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')

  const loadShopData = useCallback(async () => {
    try {
      const [loadedProducts, loadedCategories] = await Promise.all([getProducts(), getCategories()])
      setProducts(loadedProducts)
      setCategories(loadedCategories)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadShopData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadShopData])

  const retryShopData = () => {
    setIsLoading(true)
    void loadShopData()
  }

  const categoryOptions = ['All', ...categories.map(({ name }) => name)]
  const filteredProducts = useMemo(
    () =>
      activeCategory === 'All'
        ? products
        : products.filter((product) => product.category === activeCategory),
    [activeCategory, products],
  )

  return (
    <>
      <Navbar />
      <main>
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-14 sm:py-20 lg:py-24">
            <Breadcrumb className="mb-8" items={[{ label: 'Home', href: '/' }, { label: 'Shop' }]} />
            <div className="max-w-2xl">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
                <span className="inline-block size-2 rounded-full bg-orange" />
                The full collection
              </p>
              <h1 className="m-0 text-5xl font-bold leading-[0.98] tracking-[-0.05em] text-green-dark sm:text-6xl">
                Shop
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
                Good food starts with great ingredients. Find carefully sourced staples and everyday essentials, delivered with the same care we put into every order.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-14 sm:py-18 lg:py-24" aria-labelledby="collection-heading">
          <div className="mb-8 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-orange">Browse our range</p>
              <h2 id="collection-heading" className="m-0 text-3xl font-bold tracking-[-0.04em] text-green-dark sm:text-4xl">
                Shop by category
              </h2>
            </div>
            <p className="text-sm text-muted">
              {isLoading ? 'Loading products' : `${filteredProducts.length} ${filteredProducts.length === 1 ? 'product' : 'products'}`}
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-12" aria-label="Loading shop">
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <div className="h-11 w-24 animate-pulse rounded-full bg-sage" key={index} />
                ))}
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div className="h-[320px] animate-pulse rounded-2xl bg-sage" key={index} />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-line bg-sage/25 px-6 py-16 text-center sm:px-10">
              <p className="m-0 text-sm text-muted">We couldn’t load the collection right now.</p>
              <button
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
                type="button"
                onClick={retryShopData}
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="mb-12 flex flex-wrap gap-2" role="group" aria-label="Filter products by category">
                {categoryOptions.map((category) => {
                  const isActive = category === activeCategory

                  return (
                    <button
                      className={`rounded-full border px-5 py-2.5 text-sm font-bold transition-all duration-200 ${
                        isActive
                          ? 'border-green bg-green text-cream shadow-md shadow-green/10'
                          : 'border-line bg-white text-muted hover:border-green/30 hover:text-green'
                      }`}
                      key={category}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveCategory(category)}
                    >
                      {category}
                    </button>
                  )
                })}
              </div>

              {filteredProducts.length > 0 ? (
            <ProductGrid products={filteredProducts} showDetails />
              ) : (
                <div className="rounded-3xl border border-dashed border-green/25 bg-sage/25 px-6 py-16 text-center sm:px-10">
                  <div className="mx-auto max-w-md">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-orange">Coming soon</p>
                    <h3 className="m-0 text-2xl font-bold tracking-[-0.03em] text-green-dark">
                      More {activeCategory.toLowerCase()} favourites are on the way.
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      We are carefully sourcing this collection. In the meantime, explore the rest of our everyday essentials.
                    </p>
                    <button
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
                      type="button"
                      onClick={() => setActiveCategory('All')}
                    >
                      View all products <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="border-t border-line bg-cream py-14 sm:py-18">
          <div className="container flex flex-col justify-between gap-5 rounded-3xl bg-green-dark px-6 py-8 text-cream sm:flex-row sm:items-center sm:px-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Need a little help?</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">We’re happy to help you choose.</h2>
            </div>
            <Link
              className="inline-flex w-fit items-center gap-2 rounded-full bg-orange px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-orange/85"
              to="/#contact"
            >
              Talk to us <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}