import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { ProductGrid } from '../components/products/ProductGrid'
import { BreadcrumbBar } from '../components/ui/Breadcrumb'
import { SelectField } from '../components/ui/SelectField'
import { getCategories } from '../services/categoryService'
import { ApiError } from '../services/api'
import { getNewArrivals, getProducts, type ProductPage } from '../services/productService'
import type { Category } from '../types/category'
import { Seo } from '../seo/Seo'
import {
  getAbsoluteUrl,
  getBreadcrumbSchema,
  getCategoryMetaDescription,
  getCategoryTitle as getCategoryPageTitle,
  NEW_ARRIVALS_DESCRIPTION,
  NEW_ARRIVALS_TITLE,
  SHOP_DESCRIPTION,
  SHOP_TITLE,
} from '../seo/config'

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

  const [categories, setCategories] = useState<Category[]>([])
  const [result, setResult] = useState<ProductPage | null>(null)
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
  const [isProductsLoading, setIsProductsLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)

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

  const clearFilters = () => {
    setSearchParams({})
  }

  const products = result?.products ?? []
  const pagination = result?.pagination
  const hasActiveFilters = Boolean(searchValue || categoryValue || sortValue !== 'relevance')
  const pageTitle = newArrivalsOnly
    ? NEW_ARRIVALS_TITLE
    : selectedCategory
      ? getCategoryPageTitle(selectedCategory.name)
      : SHOP_TITLE
  const pageDescription = newArrivalsOnly
    ? NEW_ARRIVALS_DESCRIPTION
    : selectedCategory
      ? getCategoryMetaDescription(selectedCategory.name, selectedCategory.description)
      : SHOP_DESCRIPTION
  const categoryPath = selectedCategory ? `/shop?category=${encodeURIComponent(selectedCategory.slug)}` : '/shop'
  const canonicalPath = newArrivalsOnly ? '/new-arrivals' : selectedCategory && !searchValue ? categoryPath : '/shop'
  const hasNonCanonicalFilters = Boolean(searchValue || sortValue !== 'relevance' || pageValue > 1)
  const collectionJsonLd = selectedCategory || newArrivalsOnly
    ? [
        getBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: newArrivalsOnly ? 'New Arrivals' : selectedCategory?.name ?? 'Shop', path: canonicalPath },
        ]),
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: pageTitle,
          description: pageDescription,
          url: getAbsoluteUrl(canonicalPath),
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: products.length,
            itemListElement: products.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: getAbsoluteUrl(`/product/${item.slug ?? item.id}`),
              name: item.name,
            })),
          },
        },
      ]
    : null

  return (
    <>
      <Seo
        title={pageTitle}
        description={pageDescription}
        canonicalPath={canonicalPath}
        noIndex={hasNonCanonicalFilters}
        jsonLd={collectionJsonLd}
      />
      <Navbar />
      <BreadcrumbBar items={[{ label: 'Home', href: '/' }, { label: newArrivalsOnly ? 'New Arrivals' : 'Shop' }]} />
      <main>
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-8 sm:py-10 lg:py-12">
            <div className="max-w-2xl">
              <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
                <span className="inline-block size-2 rounded-full bg-orange" />
                {newArrivalsOnly ? 'Fresh on the shelf' : 'The full collection'}
              </p>
              <h1 className="m-0 text-4xl font-bold leading-none tracking-[-0.05em] text-green-dark sm:text-5xl">
                {newArrivalsOnly ? 'New arrivals' : selectedCategory?.name ?? 'Shop'}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
                {newArrivalsOnly
                  ? 'Fresh Nigerian foodstuff, added recently and delivered with care.'
                  : selectedCategory
                    ? `${selectedCategory.description || `Quality ${selectedCategory.name.toLowerCase()} for your pantry.`} Delivered with care.`
                    : 'Quality Nigerian foodstuff for your pantry, delivered with care.'}
              </p>
            </div>
          </div>
        </section>

        <section className="container py-14 sm:py-18 lg:py-24" aria-labelledby="collection-heading">
          <div className="mb-8">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-orange">Browse our range</p>
              <h2 id="collection-heading" className="m-0 text-3xl font-bold tracking-[-0.04em] text-green-dark sm:text-4xl">
                 {selectedCategory?.name ?? (newArrivalsOnly ? 'Latest additions' : 'Shop by category')}
              </h2>
            </div>
          </div>

           <div className="shop-filters mb-10 rounded-2xl border border-line bg-white p-3 sm:p-4">
             <div className="shop-category-filter">
               <div className="shop-filter-heading">
                 <span>Browse categories</span>
                 {!isCategoriesLoading && categories.length > 0 && <span className="shop-filter-count">{categories.length + 1} options</span>}
               </div>
               <div className="shop-category-rail" role="list" aria-label="Product categories" aria-busy={isCategoriesLoading}>
                 <button
                   className={`shop-category-chip ${!categoryValue ? 'is-active' : ''}`}
                   type="button"
                   aria-pressed={!categoryValue}
                   onClick={() => updateParams({ category: undefined, page: undefined })}
                   disabled={isCategoriesLoading}
                 >
                   All categories
                 </button>
                 {isCategoriesLoading
                   ? Array.from({ length: 4 }, (_, index) => <span className="shop-category-chip-skeleton" aria-hidden="true" key={index} />)
                   : categories.map((category) => (
                     <button
                       className={`shop-category-chip ${categoryValue === category.slug || categoryValue === category.id ? 'is-active' : ''}`}
                       type="button"
                       aria-pressed={categoryValue === category.slug || categoryValue === category.id}
                       onClick={() => updateParams({ category: category.slug, page: undefined })}
                       key={category.id}
                     >
                       {category.name}
                     </button>
                   ))}
               </div>
             </div>
             <div className="shop-filter-controls">
              {!newArrivalsOnly ? (
                <SelectField
                   ariaLabel="Sort products"
                  className="filter-select-wrap"
                  options={SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                  onChange={(value) => updateParams({ sort: value === 'relevance' ? undefined : value, page: undefined })}
                  value={SORT_OPTIONS.some((option) => option.value === sortValue) ? sortValue : 'relevance'}
                  variant="filter"
                />
              ) : (
                <span className="filter-pill">
                   <span className="ui-truncate">Newest first</span>
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
            <div className="product-grid" aria-label="Loading products">
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
              <ProductGrid products={products} />
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