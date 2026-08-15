import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, CartIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { ProductGrid } from '../components/products/ProductGrid'
import { ProductPrice } from '../components/products/ProductPrice'
import { WishlistButton } from '../components/products/WishlistButton'
import { BreadcrumbBar } from '../components/ui/Breadcrumb'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { useCart } from '../hooks/useCart'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { ApiError } from '../services/api'
import { getProduct, getProducts } from '../services/productService'
import type { Product } from '../types/product'
import { Seo } from '../seo/Seo'
import {
  getAbsoluteUrl,
  getBreadcrumbSchema,
  getProductMetaDescription,
  getProductTitle,
  getSiteUrl,
  SITE_NAME,
} from '../seo/config'

export function ProductDetails() {
  const { id } = useParams<{ id: string }>()
  const [quantity, setQuantity] = useState(1)
  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [imageError, setImageError] = useState(false)
  const { addToCart, items, pendingItemIds } = useCart()
  const { user, openAuth } = useCustomerAuth()
  const { showToast } = useToast()

  const loadProduct = useCallback(async () => {
    await Promise.resolve()

    if (!id) {
      setProduct(null)
      setIsNotFound(true)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setHasError(false)
    setIsNotFound(false)
    setProduct(null)
    setRelatedProducts([])
    setImageError(false)
    setQuantity(1)

    try {
      const loadedProduct = await getProduct(id)
      setProduct(loadedProduct)

      try {
        const allProducts = (await getProducts({ category: loadedProduct.categorySlug, limit: 8 })).products
        setRelatedProducts(
          allProducts.filter(
            (item) => item.id !== loadedProduct.id,
          ),
        )
      } catch {
        // Related products are optional; the requested product remains usable.
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setIsNotFound(true)
      } else {
        setHasError(true)
      }
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProduct()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadProduct])

  const currentCartQuantity = product
    ? items.find((item) => item.id === product.id)?.quantity ?? 0
    : 0
  const availableStock = product?.stockQuantity ?? 0
  const remainingStockForCart = Math.max(0, availableStock - currentCartQuantity)
  const maxSelectableQuantity = Math.max(1, remainingStockForCart)
  const selectedQuantity = Math.min(quantity, maxSelectableQuantity)
  const canAddToCart = Boolean(product?.isAvailable && remainingStockForCart > 0)

  const retryProduct = () => {
    setIsLoading(true)
    void loadProduct()
  }

  const addProductToCart = async () => {
    if (!product || !canAddToCart) return
    try {
      await addToCart(product, selectedQuantity)
      showToast(`${product.name} added to your cart.`, 'success')
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'This product could not be added to your cart.', 'error')
    }
  }

  const handleAddToCart = () => {
    if (!product?.isAvailable || !canAddToCart) return
    if (!user) {
      openAuth(addProductToCart)
      return
    }
    addProductToCart()
  }

  const isAdding = product ? pendingItemIds.includes(product.id) : false
  const productPath = product ? `/product/${product.slug ?? product.id}` : `/product/${id ?? ''}`
  const productDescription = product ? getProductMetaDescription(product.name) : 'View product details from Ayanfe Food Variety.'
  const productSchema = product ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': getAbsoluteUrl(productPath),
    name: product.name,
    description: product.description,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
    ...(product.image ? { image: [getAbsoluteUrl(product.image)] } : {}),
    category: product.category,
    offers: {
      '@type': 'Offer',
      url: getSiteUrl() ? new URL(productPath, `${getSiteUrl()}/`).toString() : productPath,
      priceCurrency: 'NGN',
       price: product.discountedPrice.toFixed(2),
      availability: product.isAvailable
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  } : null

  if (isLoading) {
    return (
      <>
        <Seo
          title={`Product details | ${SITE_NAME}`}
          description="View product details, pricing, and availability from Ayanfe Food Variety."
          canonicalPath={productPath}
        />
        <Navbar />
        <BreadcrumbBar items={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }, { label: 'Product' }]} />
        <main className="container py-16 sm:py-24" aria-label="Loading product details">
          <div className="grid animate-pulse items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="aspect-square rounded-3xl bg-sage" />
            <div>
              <div className="h-4 w-32 rounded bg-sage" />
              <div className="mt-6 h-16 max-w-xl rounded bg-sage" />
              <div className="mt-6 h-8 w-40 rounded bg-sage" />
              <div className="mt-6 h-24 max-w-xl rounded bg-sage" />
              <div className="mt-8 h-12 max-w-sm rounded-xl bg-sage" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (hasError) {
    return (
      <>
        <Seo
          title={`Product unavailable | ${SITE_NAME}`}
          description="This product could not be loaded. Browse the Ayanfe Food Variety shop for available foodstuff and groceries."
          canonicalPath={productPath}
          noIndex
        />
        <Navbar />
        <BreadcrumbBar items={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }, { label: 'Product unavailable' }]} />
        <main className="container page-state-section flex items-center justify-center py-16">
          <section className="w-full max-w-xl rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm sm:px-10">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Something went wrong</p>
            <h1 className="m-0 text-4xl font-bold tracking-[-0.04em] text-green-dark sm:text-5xl">
              We couldn’t load this product
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
              Please try again. If the problem continues, explore the rest of our collection.
            </p>
                     <button
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
              type="button"
              onClick={retryProduct}
            >
              Try again <ArrowRight size={16} />
            </button>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  if (isNotFound || !product) {
    return (
      <>
        <Seo
          title={`Product not found | ${SITE_NAME}`}
          description="This product is not available in the current Ayanfe Food Variety collection."
          canonicalPath={productPath}
          noIndex
        />
        <Navbar />
        <BreadcrumbBar items={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }, { label: 'Product not found' }]} />
        <main className="container page-state-section flex items-center justify-center py-16">
          <section className="w-full max-w-xl rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm sm:px-10" aria-labelledby="not-found-heading">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Sorry, we couldn’t find that</p>
            <h1 id="not-found-heading" className="m-0 text-4xl font-bold tracking-[-0.04em] text-green-dark sm:text-5xl">
              Product not found
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
              The product you’re looking for may have moved or is not available in our current collection.
            </p>
            <Link
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
              to="/shop"
            >
              Back to shop <ArrowRight size={16} />
            </Link>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Seo
        title={getProductTitle(product.name)}
        description={productDescription}
        canonicalPath={productPath}
        image={product.image || undefined}
        imageAlt={`${product.name} - Ayanfe Food Variety`}
        type="product"
        jsonLd={[
          productSchema!,
          getBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Shop', path: '/shop' },
            { name: product.category, path: product.categorySlug ? `/shop?category=${encodeURIComponent(product.categorySlug)}` : '/shop' },
            { name: product.name, path: productPath },
          ]),
        ]}
      />
      <Navbar />
        <BreadcrumbBar items={[
          { label: 'Home', href: '/' },
          { label: 'Shop', href: '/shop' },
          { label: product.name },
        ]} />
      <main>
        <section className="container py-12 sm:py-16 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <figure className="m-0 overflow-hidden rounded-3xl border border-line bg-sage shadow-sm">
              <div className="aspect-square overflow-hidden">
                {product.image && !imageError ? (
                  <img
                    className="size-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                    src={product.image}
                    alt={`${product.name} - Ayanfe Food Variety`}
                    width={720}
                    height={720}
                    fetchPriority="high"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center px-8 text-center text-sm font-semibold text-muted" role="img" aria-label={`${product.name} image unavailable`}>
                    Image unavailable
                  </div>
                )}
              </div>
            </figure>

            <article>
              <p className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
                <span className="inline-block size-2 rounded-full bg-orange" />
                Product details
              </p>
              <div className="flex items-start justify-between gap-4">
                <h1 className="m-0 max-w-xl text-4xl font-bold leading-[1.05] tracking-[-0.05em] text-green-dark sm:text-5xl lg:text-6xl">
                  {product.name}
                </h1>
                <WishlistButton product={product} />
              </div>
              <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-2">
                <ProductPrice
                  className="text-2xl font-bold text-green-dark"
                  originalPrice={product.price}
                  discountedPrice={product.discountedPrice}
                  discountedClassName="text-green-dark"
                  originalClassName="ml-2 text-base font-normal text-muted"
                />
                <span className="text-sm text-muted">per {product.unit}</span>
              </div>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">
                {product.description}
              </p>

              <div className="my-8 h-px bg-line" />

              <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor="quantity">
                    Quantity
                  </label>
                  <div className="flex h-12 items-center rounded-xl border border-line bg-white">
                    <button
                      className="grid size-11 place-items-center text-xl text-muted transition-colors hover:text-green disabled:cursor-not-allowed disabled:opacity-40"
                      type="button"
                      aria-label="Decrease quantity"
                      disabled={selectedQuantity === 1 || !canAddToCart}
                      onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    >
                      −
                    </button>
                    <output className="min-w-9 text-center text-sm font-bold text-green-dark" id="quantity" aria-live="polite">
                      {selectedQuantity}
                    </output>
                    <button
                      className="grid size-11 place-items-center text-xl text-muted transition-colors hover:text-green"
                      type="button"
                      aria-label="Increase quantity"
                      disabled={!canAddToCart || selectedQuantity >= maxSelectableQuantity}
                      onClick={() => setQuantity((current) => Math.min(maxSelectableQuantity, current + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>
                <Button
                  className="h-12 flex-1 px-6 shadow-lg shadow-green/15 hover:-translate-y-0.5"
                  type="button"
                  onClick={handleAddToCart}
                   disabled={!canAddToCart || isAdding}
                   aria-label={`Add ${selectedQuantity} ${product.name} to cart`}
                >
                   <CartIcon size={18} /> {isAdding
                     ? 'Adding…'
                     : availableStock === 0
                       ? 'Out of stock'
                       : canAddToCart
                         ? 'Add to cart'
                         : 'All available in cart'}
                </Button>
              </div>
               <p className={`mt-4 text-sm font-semibold ${availableStock > 0 ? 'text-green-dark' : 'text-orange'}`} role="status" aria-live="polite">
                 {availableStock > 0
                   ? `${availableStock} ${availableStock === 1 ? 'unit' : 'units'} available`
                   : 'Out of stock'}
               </p>
               {availableStock > 0 && currentCartQuantity >= availableStock && (
                 <p className="mt-1 text-xs text-muted">All available units are already in your cart.</p>
               )}
              <p className="mt-3 text-xs text-muted">
                 {selectedQuantity} {selectedQuantity === 1 ? 'unit' : 'units'} selected
              </p>
            </article>
          </div>
        </section>

        <section className="border-t border-line bg-cream py-14 sm:py-18 lg:py-24" aria-labelledby="related-products-heading">
          <div className="container">
            <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-orange">You may also like</p>
                <h2 id="related-products-heading" className="m-0 text-3xl font-bold tracking-[-0.04em] text-green-dark sm:text-4xl">
                  More from {product.category}
                </h2>
              </div>
              <Link className="inline-flex items-center gap-2 text-sm font-bold text-green transition-all hover:gap-3" to="/shop">
                Browse all products <ArrowRight size={16} />
              </Link>
            </div>
            {relatedProducts.length > 0 ? (
              <ProductGrid products={relatedProducts} />
            ) : (
              <div className="rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-10 text-center">
                <p className="m-0 text-sm text-muted">
                  This is currently our only {product.category.toLowerCase()} pick. Explore the full collection for more everyday essentials.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}