import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, CartIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { ProductGrid } from '../components/products/ProductGrid'
import { ProductPrice } from '../components/products/ProductPrice'
import { ProductOptionSelector } from '../components/products/ProductOptionSelector'
import { WholesalePricing } from '../components/products/WholesalePricing'
import { WishlistButton } from '../components/products/WishlistButton'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { useCart } from '../hooks/useCart'
import { cartItemLineKey } from '../context/cartContext'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { ApiError } from '../services/api'
import {
  getProduct,
  getProductWholesalePricing,
  getProducts,
  getWholesaleUnitPrice,
} from '../services/productService'
import type { Product, WholesaleOptionPricing } from '../types/product'
import { Seo } from '../seo/Seo'
import { optimizedImageUrl } from '../utils/optimizedImageUrl'
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
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set())
  const touchStartX = useRef<number | null>(null)
  const { addToCart, items, pendingItemIds } = useCart()
  const { user, shoppingMode } = useCustomerAuth()
  const { showToast } = useToast()
  const isWholesaleShopper = user?.role === 'CUSTOMER' && shoppingMode === 'WHOLESALE'
  const [wholesalePricing, setWholesalePricing] = useState<{
    productId: string
    status: 'ready' | 'error'
    options: WholesaleOptionPricing[]
  } | null>(null)
  const [wholesaleLookup, setWholesaleLookup] = useState<{
    context: string
    unitPrice?: number
    error?: string
  } | null>(null)

  const isWholesalePricingVisible = isWholesaleShopper && Boolean(product) && wholesalePricing?.productId === product?.id
  const effectiveWholesalePricingOptions = isWholesalePricingVisible && product
    ? (wholesalePricing?.options ?? [])
    : []
  const effectiveWholesalePricingStatus = isWholesaleShopper && product
    ? (isWholesalePricingVisible ? wholesalePricing!.status : 'loading')
    : 'idle'

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
    setActiveImageIndex(0)
    setFailedImageUrls(new Set())
    setQuantity(1)
    setSelectedOptionId(null)

    try {
      const loadedProduct = await getProduct(id)
      setProduct(loadedProduct)

      const loadedOptions = loadedProduct.options ?? []
      if (loadedOptions.length > 0) {
        const sortedOptions = [...loadedOptions].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
        )
        setSelectedOptionId((sortedOptions.find((option) => option.stockQuantity > 0) ?? sortedOptions[0])?.id ?? null)
      }

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

  const productImages = product
    ? (product.images?.filter(Boolean).length ? product.images.filter(Boolean) : product.image ? [product.image] : [])
    : []

  // Keep the selected image within range whenever the product or its gallery
  // changes, without synchronising state from an effect.
  const effectiveActiveImageIndex = productImages.length > 0
    ? Math.min(activeImageIndex, productImages.length - 1)
    : 0

  useEffect(() => {
    if (productImages.length < 2) return
    const timer = window.setTimeout(() => {
      setActiveImageIndex((current) => (current + 1) % productImages.length)
    }, 5000)
    return () => window.clearTimeout(timer)
  }, [activeImageIndex, productImages.length])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProduct()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadProduct])

  useEffect(() => {
    if (!isWholesaleShopper || !product) return
    let cancelled = false
    const controller = new AbortController()
    const productId = product.id
    getProductWholesalePricing(productId, controller.signal)
      .then((pricing) => {
        if (cancelled) return
        setWholesalePricing({ productId, status: 'ready', options: pricing.options })
      })
      .catch(() => {
        if (cancelled) return
        setWholesalePricing({ productId, status: 'error', options: [] })
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isWholesaleShopper, product])

  const currentCartQuantity = product
    ? items.find((item) => item.id === product.id)?.quantity ?? 0
    : 0
  const productOptions = product?.options?.length
    ? [...product.options].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
    : []
  const hasOptions = productOptions.length > 0
  const selectedOption = hasOptions
    ? (productOptions.find((option) => option.id === selectedOptionId) ?? null)
    : null
  const availableStock = hasOptions
    ? (selectedOption?.stockQuantity ?? 0)
    : (product?.stockQuantity ?? 0)
  const remainingStockForCart = hasOptions
    ? availableStock
    : Math.max(0, availableStock - currentCartQuantity)
  const maxSelectableQuantity = Math.max(1, remainingStockForCart)
  const selectedOptionWholesale = hasOptions
    ? (effectiveWholesalePricingOptions.find((option) => option.optionId === selectedOptionId) ?? null)
    : null
  const isOptionWholesaleConfigured = selectedOptionWholesale !== null
  const quantityFloor = isWholesaleShopper && isOptionWholesaleConfigured
    ? Math.max(1, Math.min(selectedOptionWholesale.moq ?? 1, maxSelectableQuantity))
    : 1
  const selectedQuantity = Math.max(quantityFloor, Math.min(quantity, maxSelectableQuantity))
  const canAddToCart = Boolean(
    product?.isAvailable
    && (!hasOptions || selectedOption !== null)
    && remainingStockForCart > 0,
  )

  const isWholesaleLookupApplicable =
    isWholesaleShopper && Boolean(product) && Boolean(selectedOption) && selectedOptionWholesale !== null
  const wholesaleLookupContext = isWholesaleLookupApplicable
    ? `${product!.id}|${selectedOption!.id}|${selectedQuantity}`
    : null
  const currentWholesaleLookup = wholesaleLookupContext !== null && wholesaleLookup?.context === wholesaleLookupContext
    ? wholesaleLookup
    : null
  const effectiveWholesaleUnitPrice = currentWholesaleLookup?.unitPrice ?? null
  const effectiveWholesaleLookupLoading = isWholesaleLookupApplicable
    && currentWholesaleLookup === null
    && effectiveWholesalePricingStatus === 'ready'
    && selectedOptionWholesale !== null
  const effectiveWholesaleLookupError = currentWholesaleLookup?.error ?? null

  useEffect(() => {
    if (!isWholesaleLookupApplicable) return
    let cancelled = false
    const context = wholesaleLookupContext!
    getWholesaleUnitPrice(product!.id, selectedOption!.id, selectedQuantity)
      .then((result) => {
        if (!cancelled) setWholesaleLookup({ context, unitPrice: result.unitPrice })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setWholesaleLookup({
          context,
          error: error instanceof Error ? error.message : 'Wholesale pricing could not be calculated right now.',
        })
      })
    return () => {
      cancelled = true
    }
  }, [isWholesaleLookupApplicable, wholesaleLookupContext, product, selectedOption, selectedQuantity])

  const retryProduct = () => {
    setIsLoading(true)
    void loadProduct()
  }

  const selectImage = (index: number) => {
    if (index < 0 || index >= productImages.length) return
    setActiveImageIndex(index)
  }

  const moveImage = (direction: -1 | 1) => {
    if (productImages.length < 2) return
    setActiveImageIndex((current) => (current + direction + productImages.length) % productImages.length)
  }

  const handleGalleryTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null
  }

  const handleGalleryTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (touchStartX.current === null) return
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current
    const delta = endX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 40) return
    moveImage(delta < 0 ? 1 : -1)
  }

  const addProductToCart = async () => {
    if (!product || !canAddToCart) return
    try {
      await addToCart(product, selectedQuantity, selectedOption)
      showToast(`${product.name} added to your cart.`, 'success')
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'This product could not be added to your cart.', 'error')
    }
  }

  const handleAddToCart = () => {
    if (!product?.isAvailable || !canAddToCart) return
    void addProductToCart()
  }

  const isAdding = product ? pendingItemIds.includes(cartItemLineKey(product.id, selectedOption?.id ?? null)) : false
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
    ...(productImages.length ? { image: productImages.map((image) => getAbsoluteUrl(image)) } : {}),
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
        <main className="container py-16 sm:py-24" aria-label="Loading product details">
          <Breadcrumb
            className="mb-8"
            items={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }, { label: 'Product' }]}
          />
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
        <main className="container page-state-section py-16">
          <div className="mx-auto w-full max-w-xl">
            <Breadcrumb
              className="mb-8"
              items={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }, { label: 'Product unavailable' }]}
            />
            <section className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm sm:px-10">
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
          </div>
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
        <main className="container page-state-section py-16">
          <div className="mx-auto w-full max-w-xl">
            <Breadcrumb
              className="mb-8"
              items={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }, { label: 'Product not found' }]}
            />
            <section className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm sm:px-10" aria-labelledby="not-found-heading">
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
          </div>
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
      <main>
        <section className="container py-12 sm:py-16 lg:py-24">
          <Breadcrumb
            className="mb-8"
            items={[
              { label: 'Home', href: '/' },
              { label: 'Shop', href: '/shop' },
              { label: product.name },
            ]}
          />
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <figure className="m-0 overflow-hidden rounded-3xl border border-line bg-sage shadow-sm">
              <div
                className="relative aspect-square overflow-hidden"
                onTouchStart={handleGalleryTouchStart}
                onTouchEnd={handleGalleryTouchEnd}
                onTouchCancel={() => { touchStartX.current = null }}
              >
                {productImages[effectiveActiveImageIndex] && !failedImageUrls.has(productImages[effectiveActiveImageIndex]) ? (
                  <img
                    className="size-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                    src={optimizedImageUrl(productImages[effectiveActiveImageIndex], 720)}
                    alt={`${product.name} image ${effectiveActiveImageIndex + 1} - Ayanfe Food Variety`}
                    width={720}
                    height={720}
                    loading={effectiveActiveImageIndex === 0 ? 'eager' : 'lazy'}
                    fetchPriority={effectiveActiveImageIndex === 0 ? 'high' : 'auto'}
                    onError={() => setFailedImageUrls((current) => new Set(current).add(productImages[effectiveActiveImageIndex]))}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center px-8 text-center text-sm font-semibold text-muted" role="img" aria-label={`${product.name} image unavailable`}>
                    Image unavailable
                  </div>
                )}
                {productImages.length > 1 && (
                  <>
                    <button className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/60 bg-white/90 text-xl font-bold text-green-dark shadow-lg transition-colors hover:bg-white" type="button" aria-label="Previous product image" onClick={() => moveImage(-1)}>‹</button>
                    <button className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/60 bg-white/90 text-xl font-bold text-green-dark shadow-lg transition-colors hover:bg-white" type="button" aria-label="Next product image" onClick={() => moveImage(1)}>›</button>
                  </>
                )}
              </div>
              {productImages.length > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 bg-white p-3" role="tablist" aria-label="Product images">
                  {productImages.map((image, index) => (
                    <button
                      className={`overflow-hidden rounded-lg border-2 ${index === effectiveActiveImageIndex ? 'border-orange' : 'border-transparent'}`}
                      type="button"
                      role="tab"
                      aria-label={`Show product image ${index + 1}`}
                      aria-selected={index === effectiveActiveImageIndex}
                      onClick={() => selectImage(index)}
                      key={`${image}-${index}`}
                    >
                      <img className="size-14 object-cover sm:size-16" src={optimizedImageUrl(image, 120)} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
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
                {isWholesaleShopper && isOptionWholesaleConfigured ? (
                  <WholesalePricing
                    optionLabel={selectedOption ? selectedOption.label : product.unit}
                    moq={selectedOptionWholesale?.moq ?? null}
                    tiers={selectedOptionWholesale?.tiers ?? []}
                    quantity={selectedQuantity}
                    unitPrice={effectiveWholesaleUnitPrice}
                    isCalculating={effectiveWholesaleLookupLoading}
                    error={effectiveWholesaleLookupError}
                  />
                ) : (
                  <>
                    <ProductPrice
                      className="text-2xl font-bold text-green-dark"
                      originalPrice={selectedOption ? selectedOption.price : product.price}
                      discountedPrice={selectedOption ? selectedOption.price : product.discountedPrice}
                      discountedClassName="text-green-dark"
                      originalClassName="ml-2 text-base font-normal text-muted"
                    />
                    <span className="text-sm text-muted">per {selectedOption ? selectedOption.label : product.unit}</span>
                  </>
                )}
              </div>
              {isWholesaleShopper
                && effectiveWholesalePricingStatus === 'ready'
                && !hasOptions && (
                  <p className="wholesale-note" role="status">
                    Wholesale pricing is not available for this product yet.
                  </p>
                )}
              {isWholesaleShopper
                && effectiveWholesalePricingStatus === 'ready'
                && hasOptions
                && !isOptionWholesaleConfigured && (
                  <p className="wholesale-note" role="status">
                    Wholesale pricing is not available for this size yet.
                  </p>
                )}
              <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">
                {product.description}
              </p>

              <div className="my-8 h-px bg-line" />

              {hasOptions && (
                <div className="mb-5">
                  <ProductOptionSelector
                    options={productOptions}
                    selectedOptionId={selectedOption?.id ?? null}
                    onSelect={setSelectedOptionId}
                  />
                </div>
              )}

              <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor="quantity">
                    Quantity{isOptionWholesaleConfigured && selectedOptionWholesale?.moq
                      ? ` · MOQ ${selectedOptionWholesale.moq} units`
                      : ''}
                  </label>
                  <div className="flex h-12 items-center rounded-xl border border-line bg-white">
                    <button
                      className="grid size-11 place-items-center text-xl text-muted transition-colors hover:text-green disabled:cursor-not-allowed disabled:opacity-40"
                      type="button"
                      aria-label="Decrease quantity"
                      disabled={selectedQuantity === quantityFloor || !canAddToCart}
                      onClick={() => setQuantity((current) => Math.min(maxSelectableQuantity, Math.max(quantityFloor, current - 1)))}
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
                      onClick={() => setQuantity((current) => Math.min(maxSelectableQuantity, Math.max(quantityFloor, current + 1)))}
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
               {!hasOptions && availableStock > 0 && currentCartQuantity >= availableStock && (
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