import { Link } from 'react-router-dom'
import { HeartIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { ProductGrid } from '../components/products/ProductGrid'
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
        <div className="mb-10 flex items-end justify-between gap-6 border-b border-line pb-8">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
              <HeartIcon size={15} /> Saved for later
            </p>
            <h1 className="m-0 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-6xl">Your wishlist</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted">Keep your favourite foodstuff close and return when you are ready to shop.</p>
          </div>
          {user && products.length > 0 && <span className="rounded-full bg-sage px-4 py-2 text-sm font-bold text-green-dark">{products.length} saved</span>}
        </div>

        {isAuthLoading || (user && isLoading) ? (
          <div className="rounded-3xl border border-line bg-sage/30 px-6 py-16 text-center text-muted" role="status">Loading your wishlist…</div>
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