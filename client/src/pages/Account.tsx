import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { PersonalInformationCard } from '../components/account/PersonalInformationCard'
import { AddressesSection } from '../components/account/AddressesSection'
import { SecurityPreferencesCard } from '../components/account/security/SecurityPreferencesCard'
import { HeadsetIcon, ChatIcon } from '../assets/icons'

interface AccountProfileState {
  userId: string
  status: 'ready' | 'error'
  profile?: CustomerAccountProfile
  error?: string
}

export function Account() {
  const { user, isLoading: isAuthLoading, openAuth, setUser } = useCustomerAuth()
  useRouteToast()
  const [profileState, setProfileState] = useState<AccountProfileState | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const userId = user?.id
  const userRef = useRef(user)
  const activeProfileState = profileState && profileState.userId === userId ? profileState : null
  const profile = activeProfileState?.status === 'ready' ? activeProfileState.profile : null
  const profileError = activeProfileState?.status === 'error' ? activeProfileState.error : null

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
        // Keep the header identity in sync when the profile changes.
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

  const handleProfileUpdated = (updated: CustomerAccountProfile) => {
    if (!userId) return
    setProfileState({ userId, status: 'ready', profile: updated })
  }

  useInitialRouteLoad(!isAuthLoading && (!user || activeProfileState !== null))

  return (
    <>
      <Seo
        title={`${ACCOUNT_TITLE}`}
        description="Manage your Ayanfe Food Variety profile, saved addresses and account preferences."
        canonicalPath="/account"
      />
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-line/70 bg-sage/35">
          <div className="container py-12 sm:py-14">
            <Breadcrumb className="mb-6" items={[{ label: 'Home', href: '/' }, { label: 'Account' }]} />
            <div className="relative flex justify-between">
              <div>
                <h1 className="text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">
                  Account Settings
                </h1>
                <p className="mt-2 text-base text-muted">
                  Manage your profile, security and preferences.
                </p>
              </div>
              
            </div>
          </div>
        </section>

        <section className="container py-8 lg:py-12">
          {!isAuthLoading && !user ? (
            <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm">
              <h2 className="text-3xl font-bold text-green-dark">Sign in to manage your account</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted">
                You need to be signed in to view your profile, saved addresses and preferences.
              </p>
              <button
                className="mt-6 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark"
                type="button"
                onClick={() => void openAuth()}
              >
                Sign in or create an account
              </button>
            </div>
          ) : profileError ? (
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
            <div className="mx-auto w-full" role="status" aria-label="Loading your account">
              <div className="space-y-8">
                <div className="h-64 rounded-3xl bg-sage/60 animate-pulse" />
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="h-64 rounded-3xl bg-sage/60 animate-pulse" />
                  <div className="h-64 rounded-3xl bg-sage/60 animate-pulse" />
                </div>
                <div className="h-28 rounded-3xl bg-sage/60 animate-pulse" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-8">
                <PersonalInformationCard profile={profile} onProfileUpdated={handleProfileUpdated} />
                <div className="grid gap-8 md:grid-cols-2">
                  <AddressesSection />
                  <SecurityPreferencesCard />
                </div>
                <div className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex flex-col items-start text-left sm:flex-row sm:items-center sm:text-left">
                    <div className="flex items-center gap-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-sage text-green">
                        <HeadsetIcon size={22} />
                      </span>
                      <div>
                        <p className="text-lg font-bold text-green-dark">Need help?</p>
                        <p className="mt-0.5 text-sm text-muted">
                          Our support team is always here to help you.
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/contact"
                      className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-green px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark sm:ml-auto sm:mt-0"
                    >
                      <ChatIcon size={16} /> Contact Support
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}