import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, BagIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { ProductGrid } from '../components/products/ProductGrid'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { useCart } from '../hooks/useCart'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { ApiError } from '../services/api'
import { getProduct, getProducts } from '../services/productService'
import type { Product } from '../types/product'

export function ProductDetails() {
  const { id } = useParams<{ id: string }>()
  const [quantity, setQuantity] = useState(1)
  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [imageError, setImageError] = useState(false)
  const { addToCart, pendingItemIds } = useCart()
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

  const retryProduct = () => {
    setIsLoading(true)
    void loadProduct()
  }

  const addProductToCart = async () => {
    if (!product) return
    try {
      await addToCart(product, quantity)
      showToast(`${product.name} added to your cart.`, 'success')
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'This product could not be added to your cart.', 'error')
    }
  }

  const handleAddToCart = () => {
    if (!product?.isAvailable) return
    if (!user) {
      openAuth(addProductToCart)
      return
    }
    addProductToCart()
  }

  const isAdding = product ? pendingItemIds.includes(product.id) : false

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(price)

  if (isLoading) {
    return (
      <>
        <Navbar />
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
        <Navbar />
        <main className="container flex min-h-[calc(100vh-68px)] items-center justify-center py-16 md:min-h-[calc(100vh-78px)]">
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
        <Navbar />
        <main className="container flex min-h-[calc(100vh-68px)] items-center justify-center py-16 md:min-h-[calc(100vh-78px)]">
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
      <Navbar />
      <main>
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-8 sm:py-12">
            <Breadcrumb items={[
              { label: 'Home', href: '/' },
              { label: 'Shop', href: '/shop' },
              { label: product.name },
            ]} />
          </div>
        </section>

        <section className="container py-12 sm:py-16 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <figure className="m-0 overflow-hidden rounded-3xl border border-line bg-sage shadow-sm">
              <div className="aspect-square overflow-hidden">
                {product.image && !imageError ? (
                  <img
                    className="size-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                    src={product.image}
                    alt={`${product.name}, ${product.category}`}
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
              <h1 className="m-0 max-w-xl text-4xl font-bold leading-[1.05] tracking-[-0.05em] text-green-dark sm:text-5xl lg:text-6xl">
                {product.name}
              </h1>
              <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-2">
                <p className="m-0 text-2xl font-bold text-green-dark">{formatPrice(product.price)}</p>
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
                      disabled={quantity === 1}
                      onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    >
                      −
                    </button>
                    <output className="min-w-9 text-center text-sm font-bold text-green-dark" id="quantity" aria-live="polite">
                      {quantity}
                    </output>
                    <button
                      className="grid size-11 place-items-center text-xl text-muted transition-colors hover:text-green"
                      type="button"
                      aria-label="Increase quantity"
                       disabled={!product.isAvailable}
                       onClick={() => setQuantity((current) => current + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <Button
                  className="h-12 flex-1 px-6 shadow-lg shadow-green/15 hover:-translate-y-0.5"
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!product.isAvailable || isAdding}
                  aria-label={`Add ${quantity} ${product.name} to cart`}
                >
                  <BagIcon size={18} /> {isAdding ? 'Adding…' : product.isAvailable ? 'Add to cart' : 'Out of stock'}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted">
                {quantity} {quantity === 1 ? 'unit' : 'units'} selected
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
              <ProductGrid products={relatedProducts} showDetails />
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