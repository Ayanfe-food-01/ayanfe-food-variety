import { Link } from 'react-router-dom'
import { HeartIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { ProductGrid } from '../components/products/ProductGrid'
import { SectionHeader } from '../components/ui/SectionHeader'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { useInitialRouteLoad } from '../hooks/useInitialRouteLoad'
import { useWishlist } from '../hooks/useWishlist'
import { Seo } from '../seo/Seo'

export function Wishlist() {
  const { user, isLoading: isAuthLoading, openAuth } = useCustomerAuth()
  const { products, isLoading } = useWishlist()

  useInitialRouteLoad(!isAuthLoading && (!user || !isLoading))

  return (
    <>
      <Seo
        title="Wishlist | Ayanfe Food Variety"
        description="Save your favourite Nigerian foodstuff and groceries for later."
        canonicalPath="/wishlist"
        noIndex
      />
      <Navbar />
      <main className="container py-14 sm:py-20">
        <SectionHeader
          as="h1"
          eyebrow="Saved for later"
          title="Your wishlist"
          description="Keep your favourite foodstuff close and return when you are ready to shop."
          actions={
            user && products.length > 0 ? (
              <span className="rounded-full bg-sage px-4 py-2 text-sm font-bold text-green-dark">{products.length} saved</span>
            ) : undefined
          }
        />

        {isAuthLoading || (user && isLoading) ? (
          <div className="product-grid" role="status" aria-label="Loading your wishlist">
            {[0, 1, 2, 3].map((index) => (
              <div className="product-skeleton" key={index}>
                <div className="product-skeleton-media" />
                <div className="product-skeleton-body">
                  <div className="product-skeleton-line" />
                  <div className="product-skeleton-line" />
                </div>
                <div className="product-skeleton-action" />
              </div>
            ))}
          </div>
        ) : !user ? (
          <section className="mx-auto max-w-xl rounded-3xl border border-line bg-sage/30 px-6 py-16 text-center sm:px-10">
             <span className="flex justify-center text-green-dark"><HeartIcon size={36} /></span>
            <h2 className="mt-5 text-2xl font-bold text-green-dark">Sign in to save favourites</h2>
            <p className="mt-3 leading-7 text-muted">Your wishlist is saved to your account, so it stays with you on every device.</p>
            <button className="mt-7 rounded-xl bg-orange px-6 py-3 font-bold text-white" type="button" onClick={() => openAuth()}>Sign in to continue</button>
          </section>
        ) : products.length === 0 ? (
          <section className="mx-auto max-w-xl rounded-3xl border border-line bg-sage/30 px-6 py-16 text-center sm:px-10">
             <span className="flex justify-center text-green-dark"><HeartIcon size={36} /></span>
            <h2 className="mt-5 text-2xl font-bold text-green-dark">Nothing saved yet</h2>
             <p className="mt-3 leading-7 text-muted">Save products from their detail pages and they will appear here for later.</p>
            <Link className="mt-7 inline-flex rounded-xl bg-orange px-6 py-3 font-bold text-white" to="/shop">Browse the shop</Link>
          </section>
        ) : (
          <ProductGrid products={products} />
        )}
      </main>
      <Footer />
    </>
  )
}