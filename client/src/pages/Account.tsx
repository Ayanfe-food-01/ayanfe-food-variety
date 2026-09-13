import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  UserIcon,
  MapPinIcon,
  ClipboardListIcon,
  HeartIcon,
  LayersIcon,
  SettingsIcon,
  ArrowRight,
} from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { useInitialRouteLoad } from '../hooks/useInitialRouteLoad'
import { useRouteToast } from '../hooks/useRouteToast'
import { ApiError } from '../services/api'
import {
  getCustomerAccountProfileService,
  type CustomerAccountProfile,
} from '../services/customerAccountService'
import { Seo } from '../seo/Seo'
import { ACCOUNT_TITLE } from '../seo/config'
import { AddressesSection } from '../components/account/AddressesSection'
import { OrdersSection } from '../components/account/OrdersSection'
import { ProfileSection } from '../components/account/ProfileSection'
import { SettingsSection } from '../components/account/SettingsSection'
import { cn } from '../utils/cn'

type TabId = 'profile' | 'addresses' | 'orders' | 'settings'

interface AccountProfileState {
  userId: string
  status: 'ready' | 'error'
  profile?: CustomerAccountProfile
  error?: string
}

const quickLinks = [
  { label: 'My orders', description: 'All orders, payment status and tracking', href: '/orders', icon: ClipboardListIcon },
  { label: 'My quotes', description: 'Requested wholesale quotes and their status', href: '/quotes', icon: LayersIcon },
  { label: 'Wishlist', description: 'Products you have saved for later', href: '/wishlist', icon: HeartIcon },
]

const tabs: { id: TabId; label: string; icon: typeof UserIcon }[] = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'addresses', label: 'Addresses', icon: MapPinIcon },
  { id: 'orders', label: 'Orders', icon: ClipboardListIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

export function Account() {
  const { user, isLoading: isAuthLoading, logout, openAuth, shoppingMode, setUser } = useCustomerAuth()
  useRouteToast()
  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const [profileState, setProfileState] = useState<AccountProfileState | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const userId = user?.id
  const userRef = useRef(user)
  const activeProfileState = profileState && profileState.userId === userId ? profileState : null
  const profile = activeProfileState?.status === 'ready' ? activeProfileState.profile : null
  const profileError = activeProfileState?.status === 'error' ? activeProfileState.error : null
  const initials = useMemo(
    () => (profile?.name ?? user?.name ?? '').charAt(0).toUpperCase() || 'C',
    [profile?.name, user?.name],
  )

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    if (isAuthLoading || !userId) return
    let active = true
    getCustomerAccountProfileService()
      .then((result) => {
        if (!active) return
        setProfileState({ userId, status: 'ready', profile: result })
        // Keep the header/sidebar identity in sync when the profile changes.
        const current = userRef.current
        if (current) setUser({ ...current, name: result.name, phone: result.phone })
      })
      .catch((caught: unknown) => {
        if (!active) return
        if (caught instanceof ApiError && caught.status === 401) return
        setProfileState({
          userId,
          status: 'error',
          error: caught instanceof ApiError ? caught.message : 'Your profile could not be loaded.',
        })
      })
    return () => { active = false }
  }, [isAuthLoading, reloadNonce, setUser, userId])

  const retryProfile = () => {
    setProfileState(null)
    setReloadNonce((current) => current + 1)
  }

  const handleProfileUpdated = useCallback((updated: CustomerAccountProfile) => {
    if (!userId) return
    setProfileState({ userId, status: 'ready', profile: updated })
    const current = userRef.current
    if (current) setUser({ ...current, name: updated.name, phone: updated.phone })
  }, [setUser, userId])

  useInitialRouteLoad(!isAuthLoading && (!user || activeProfileState !== null))

  return (
    <>
      <Seo title={`${ACCOUNT_TITLE}`} description="Manage your Ayanfe Food Variety profile, addresses, orders and account settings." canonicalPath="/account" />
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-12 sm:py-16">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Your account</p>
            <h1 className="m-0 text-5xl font-bold tracking-[-0.05em] text-green-dark sm:text-6xl">Account</h1>
            <p className="mt-4 text-base text-muted">Your profile, saved addresses, orders and settings.</p>
          </div>
        </section>
        <section className="container py-12 sm:py-16 lg:py-24">
          {!isAuthLoading && !user ? (
            <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm">
              <h2 className="text-3xl font-bold text-green-dark">Sign in to manage your account</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted">
                You need to be signed in to view your profile, saved addresses and orders.
              </p>
              <button className="mt-6 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="button" onClick={() => void openAuth()}>
                Sign in or create an account
              </button>
            </div>
          ) : (
            <div className="mx-auto max-w-6xl">
              <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
                <aside className="lg:sticky lg:top-24 lg:self-start">
                  <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-sage text-xl font-bold text-green">{initials}</span>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-green-dark">{profile?.name ?? user?.name}</p>
                        <p className="truncate text-xs text-muted">{profile?.email ?? user?.email}</p>
                      </div>
                    </div>
                    <nav aria-label="Account" className="mt-6 space-y-1">
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-colors',
                            activeTab === tab.id ? 'bg-sage text-green-dark' : 'text-muted hover:bg-sage/40 hover:text-green-dark',
                          )}
                          aria-current={activeTab === tab.id ? 'page' : undefined}
                        >
                          <tab.icon size={17} />
                          {tab.label}
                        </button>
                      ))}
                    </nav>
                    <button
                      className="mt-6 w-full rounded-full border border-orange/40 px-4 py-2.5 text-sm font-bold text-orange transition-colors hover:bg-orange hover:text-white"
                      type="button"
                      onClick={() => void logout()}
                    >
                      Sign out
                    </button>
                  </div>
                </aside>
                <div className="min-w-0">
                  {profileError ? (
                    <div className="rounded-3xl border border-orange/25 bg-orange/5 p-8 text-sm text-orange" role="alert">
                      <p>{profileError}</p>
                      <button
                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-orange/30 bg-white px-3 py-2 text-xs font-bold text-green-dark hover:bg-cream"
                        type="button"
                        onClick={retryProfile}
                      >
                        Retry loading your account
                      </button>
                    </div>
                  ) : !profile || isAuthLoading ? (
                    <div className="space-y-4" role="status" aria-label="Loading your account">
                      {[0, 1, 2].map((row) => (
                        <div className="h-44 rounded-3xl bg-sage/60 animate-pulse" key={row} />
                      ))}
                    </div>
                  ) : (
                    <>
                      {activeTab === 'profile' && <ProfileSection profile={profile} onProfileUpdated={handleProfileUpdated} />}
                      {activeTab === 'addresses' && <AddressesSection />}
                      {activeTab === 'orders' && <OrdersSection />}
                      {activeTab === 'settings' && <SettingsSection profile={profile} shoppingMode={shoppingMode} />}
                      <div className="mt-8 grid gap-4 sm:grid-cols-3">
                        {quickLinks.map((link) => (
                          <Link
                            className="group rounded-3xl border border-line bg-white p-5 shadow-sm transition-colors hover:border-green/40 hover:bg-sage/25"
                            to={link.href}
                            key={link.href}
                          >
                            <link.icon size={20} />
                            <span className="mt-4 flex items-center gap-1.5 font-bold text-green-dark">
                              {link.label}
                              <ArrowRight size={15} className="text-muted transition-transform group-hover:translate-x-0.5" />
                            </span>
                            <span className="mt-1 block text-xs text-muted">{link.description}</span>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}