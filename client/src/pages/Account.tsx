import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardListIcon, HeartIcon, LayersIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { useInitialRouteLoad } from '../hooks/useInitialRouteLoad'
import { Seo } from '../seo/Seo'
import { ACCOUNT_TITLE } from '../seo/config'

const quickLinks = [
  { label: 'My orders', description: 'Order history, payment status and tracking', href: '/orders', icon: ClipboardListIcon },
  { label: 'My quotes', description: 'Requested wholesale quotes and their status', href: '/quotes', icon: LayersIcon },
  { label: 'Wishlist', description: 'Products you have saved for later', href: '/wishlist', icon: HeartIcon },
]

export function Account() {
  const { user, isLoading: isAuthLoading, openAuth, shoppingMode, logout } = useCustomerAuth()

  useInitialRouteLoad(!isAuthLoading)

  return (
    <>
      <Seo title={ACCOUNT_TITLE} description="View and manage your Ayanfe Food Variety account details." canonicalPath="/account" />
      <Navbar />
      <main>
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-12 sm:py-16">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Your account</p>
            <h1 className="m-0 text-5xl font-bold tracking-[-0.05em] text-green-dark sm:text-6xl">Account settings</h1>
            <p className="mt-4 text-base text-muted">Your profile and everything you manage as a signed-in customer.</p>
          </div>
        </section>
        <section className="container py-12 sm:py-16 lg:py-24">
          {!isAuthLoading && !user ? (
            <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm">
              <h2 className="text-3xl font-bold text-green-dark">Sign in to manage your account</h2>
              <button className="mt-6 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="button" onClick={() => openAuth()}>
                Sign in or create an account
              </button>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-green-dark">{user?.name}</h2>
                    <p className="mt-1 truncate text-sm text-muted">{user?.email}</p>
                    <p className="mt-1 text-sm text-muted">{user?.phone || 'Phone number not provided'}</p>
                  </div>
                  <span className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] ${shoppingMode === 'WHOLESALE' ? 'bg-green-dark text-cream' : 'bg-sage text-green-dark'}`}>
                    {shoppingMode} mode
                  </span>
                </div>
                <div className="mt-6 rounded-2xl bg-cream p-4 text-xs leading-relaxed text-muted">
                  Your shopping mode decides the prices shown across the store. Switch between Retail and Wholesale from the header.
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {quickLinks.map((link) => (
                  <Link className="group rounded-3xl border border-line bg-white p-5 shadow-sm transition-colors hover:border-green/40 hover:bg-sage/25" to={link.href} key={link.href}>
                    <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-sage text-green"><link.icon size={20} /></span>
                    <span className="mt-4 flex items-center gap-1.5 font-bold text-green-dark">{link.label}<ArrowRight size={15} className="text-muted transition-transform group-hover:translate-x-0.5" /></span>
                    <span className="mt-1 block text-xs text-muted">{link.description}</span>
                  </Link>
                ))}
              </div>
              <div className="text-center">
                <button className="rounded-full border border-orange/40 px-5 py-2.5 text-sm font-bold text-orange transition-colors hover:bg-orange hover:text-white" type="button" onClick={() => void logout()}>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}