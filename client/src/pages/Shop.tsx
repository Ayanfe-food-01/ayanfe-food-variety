import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SearchIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { ProductGrid } from '../components/products/ProductGrid'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { getCategories } from '../services/categoryService'
import { ApiError } from '../services/api'
import { getNewArrivals, getProducts, type ProductPage } from '../services/productService'
import type { Category } from '../types/category'
import { Seo } from '../seo/Seo'

const PAGE_SIZE = 20
const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
] as const

const readPage = (value: string | null) => {
  const page = Number(value ?? 1)
  return Number.isInteger(page) && page > 0 ? page : 1
}

export function Shop({ newArrivalsOnly = false }: { newArrivalsOnly?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchValue = searchParams.get('search') ?? ''
  const categoryValue = searchParams.get('category') ?? ''
  const sortValue = newArrivalsOnly ? 'newest' : searchParams.get('sort') ?? 'relevance'
  const pageValue = readPage(searchParams.get('page'))
  const queryString = searchParams.toString()

  const [searchInput, setSearchInput] = useState(searchValue)
  const [categories, setCategories] = useState<Category[]>([])
  const [result, setResult] = useState<ProductPage | null>(null)
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
  const [isProductsLoading, setIsProductsLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSearchInput(searchValue), 0)
    return () => window.clearTimeout(timeoutId)
  }, [searchValue])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextParams = new URLSearchParams(window.location.search)
      const trimmedSearch = searchInput.trim()
      if ((nextParams.get('search') ?? '') === trimmedSearch) return
      if (trimmedSearch) nextParams.set('search', trimmedSearch)
      else nextParams.delete('search')
      nextParams.delete('page')
      if (nextParams.toString() !== queryString) setSearchParams(nextParams, { replace: true })
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [queryString, searchInput, setSearchParams])

  const loadCategories = useCallback(() => {
    setIsCategoriesLoading(true)
    setCategoriesError(false)
    void getCategories()
      .then(setCategories)
      .catch(() => setCategoriesError(true))
      .finally(() => setIsCategoriesLoading(false))
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadCategories, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadCategories])

  useEffect(() => {
    let current = true
    const timeoutId = window.setTimeout(() => {
      setIsProductsLoading(true)
      setProductsError(null)

      const loadProducts = newArrivalsOnly ? getNewArrivals : getProducts
      void loadProducts({
        search: searchValue || undefined,
        category: categoryValue || undefined,
        ...(!newArrivalsOnly && {
          sort: SORT_OPTIONS.some((option) => option.value === sortValue)
          ? sortValue as typeof SORT_OPTIONS[number]['value']
            : 'relevance',
        }),
        page: pageValue,
        limit: PAGE_SIZE,
      })
        .then((loadedResult) => {
          if (current) setResult(loadedResult)
        })
        .catch((error: unknown) => {
          if (current) setProductsError(error instanceof ApiError ? error.message : 'Products could not be loaded.')
        })
        .finally(() => {
          if (current) setIsProductsLoading(false)
        })
    }, 0)

    return () => {
      current = false
      window.clearTimeout(timeoutId)
    }
  }, [categoryValue, newArrivalsOnly, pageValue, searchValue, sortValue])

  const selectedCategory = useMemo(
    () => categories.find((category) => category.slug === categoryValue || category.id === categoryValue),
    [categories, categoryValue],
  )

  const updateParams = (updates: Record<string, string | undefined>) => {
    const nextParams = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value) nextParams.set(key, value)
      else nextParams.delete(key)
    })
    setSearchParams(nextParams)
  }

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateParams({ search: searchInput.trim() || undefined, page: undefined })
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearchParams({})
  }

  const products = result?.products ?? []
  const pagination = result?.pagination
  const hasActiveFilters = Boolean(searchValue || categoryValue || sortValue !== 'relevance')

  return (
    <>
      <Seo
        title={newArrivalsOnly
          ? 'New arrivals | Ayanfe Food Variety'
          : selectedCategory ? `${selectedCategory.name} products | Ayanfe Food Variety` : 'Shop Nigerian foodstuff and groceries | Ayanfe Food Variety'}
        description={newArrivalsOnly
          ? 'Discover the newest additions to Ayanfe Food Variety, from carefully sourced Nigerian foodstuff to everyday groceries.'
          : selectedCategory
          ? `${selectedCategory.description || `Browse ${selectedCategory.name.toLowerCase()} from Ayanfe Food Variety.`} Shop our available collection.`
          : 'Browse Nigerian foodstuff, pantry staples, and everyday groceries from Ayanfe Food Variety. Find carefully sourced essentials for your kitchen.'}
        canonicalPath={newArrivalsOnly ? '/new-arrivals' : '/shop'}
      />
      <Navbar />
      <main>
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-14 sm:py-20 lg:py-24">
            <Breadcrumb className="mb-8" items={[{ label: 'Home', href: '/' }, { label: newArrivalsOnly ? 'New Arrivals' : 'Shop' }]} />
            <div className="max-w-2xl">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
                <span className="inline-block size-2 rounded-full bg-orange" />
                {newArrivalsOnly ? 'Fresh on the shelf' : 'The full collection'}
              </p>
              <h1 className="m-0 text-5xl font-bold leading-[0.98] tracking-[-0.05em] text-green-dark sm:text-6xl">
                {newArrivalsOnly ? 'New Arrivals' : 'Shop'}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
                {newArrivalsOnly
                  ? 'Explore the latest products added to our collection, with the newest additions always appearing first.'
                  : 'Good food starts with great ingredients. Find carefully sourced staples and everyday essentials, delivered with the same care we put into every order.'}
              </p>
            </div>
          </div>
        </section>

        <section className="container py-14 sm:py-18 lg:py-24" aria-labelledby="collection-heading">
          <div className="mb-8 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-orange">Browse our range</p>
              <h2 id="collection-heading" className="m-0 text-3xl font-bold tracking-[-0.04em] text-green-dark sm:text-4xl">
                 {selectedCategory?.name ?? (newArrivalsOnly ? 'Latest additions' : 'Shop by category')}
              </h2>
            </div>
            <p className="text-sm text-muted">
              {isProductsLoading ? 'Loading products…' : `${pagination?.total ?? 0} ${(pagination?.total ?? 0) === 1 ? 'product' : 'products'}`}
            </p>
          </div>

          <div className="mb-10 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-5">
            <form className="relative" onSubmit={submitSearch} role="search">
              <label className="sr-only" htmlFor="product-search">Search products</label>
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input
                className="h-12 w-full rounded-xl border border-line bg-cream pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted/80 focus:border-green"
                id="product-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search products or ingredients"
              />
            </form>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex min-w-0 items-center gap-2 text-sm text-muted">
                <span className="shrink-0 font-semibold text-green-dark">Category</span>
                <select
                  className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-cream px-3 text-sm text-green-dark outline-none focus:border-green sm:w-44"
                  value={categoryValue}
                  onChange={(event) => updateParams({ category: event.target.value || undefined, page: undefined })}
                  disabled={isCategoriesLoading}
                >
                  <option value="">{isCategoriesLoading ? 'Loading…' : 'All categories'}</option>
                  {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
                </select>
              </label>
              {!newArrivalsOnly ? (
                <label className="flex min-w-0 items-center gap-2 text-sm text-muted">
                  <span className="shrink-0 font-semibold text-green-dark">Sort</span>
                  <select
                    className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-cream px-3 text-sm text-green-dark outline-none focus:border-green sm:w-44"
                    value={SORT_OPTIONS.some((option) => option.value === sortValue) ? sortValue : 'relevance'}
                    onChange={(event) => updateParams({ sort: event.target.value === 'relevance' ? undefined : event.target.value, page: undefined })}
                  >
                    {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              ) : (
                <span className="inline-flex h-12 items-center justify-center rounded-xl border border-green/15 bg-sage/50 px-4 text-sm font-semibold text-green-dark">
                  Newest first
                </span>
              )}
            </div>
          </div>

          {categoriesError && (
            <div className="mb-6 rounded-2xl border border-orange/30 bg-orange/10 px-5 py-4 text-sm text-green-dark" role="alert">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>Categories are temporarily unavailable.</span>
                <button className="font-bold text-green underline" type="button" onClick={loadCategories}>Try again</button>
              </div>
            </div>
          )}

          {isProductsLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading products">
              {Array.from({ length: 8 }, (_, index) => <div className="h-[390px] animate-pulse rounded-2xl bg-sage" key={index} />)}
            </div>
          ) : productsError ? (
            <div className="rounded-2xl border border-line bg-sage/30 px-6 py-14 text-center" role="alert">
              <h3 className="m-0 text-xl font-bold text-green-dark">Products could not be loaded</h3>
              <p className="mt-3 text-sm text-muted">{productsError}</p>
              <button className="mt-5 rounded-full bg-green px-5 py-2.5 text-sm font-bold text-cream hover:bg-green-dark" type="button" onClick={() => setSearchParams(new URLSearchParams(searchParams))}>
                Try again
              </button>
            </div>
          ) : products.length > 0 ? (
            <>
              <ProductGrid products={products} showDetails />
              {pagination && pagination.totalPages > 1 && (
                <nav className="mt-12 flex items-center justify-center gap-4" aria-label="Product pages">
                  <button
                    className="rounded-full border border-green/20 px-4 py-2 text-sm font-bold text-green transition-colors hover:bg-green hover:text-cream disabled:cursor-not-allowed disabled:opacity-40"
                    type="button"
                    disabled={pageValue <= 1}
                    onClick={() => updateParams({ page: String(pageValue - 1) })}
                  >
                    Previous
                  </button>
                  <span className="text-sm font-semibold text-muted">Page {pageValue} of {pagination.totalPages}</span>
                  <button
                    className="rounded-full border border-green/20 px-4 py-2 text-sm font-bold text-green transition-colors hover:bg-green hover:text-cream disabled:cursor-not-allowed disabled:opacity-40"
                    type="button"
                    disabled={pageValue >= pagination.totalPages}
                    onClick={() => updateParams({ page: String(pageValue + 1) })}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-14 text-center">
              <h3 className="m-0 text-xl font-bold text-green-dark">
                 {searchValue ? 'No products match your search' : categoryValue ? 'No products in this category' : newArrivalsOnly ? 'No new products are available right now' : 'No products are available right now'}
              </h3>
              <p className="mt-3 text-sm text-muted">
                 {searchValue ? 'Try a different product name or description.' : 'Please check back soon for new additions to our collection.'}
              </p>
              {hasActiveFilters && (
                <button className="mt-5 rounded-full bg-green px-5 py-2.5 text-sm font-bold text-cream hover:bg-green-dark" type="button" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}