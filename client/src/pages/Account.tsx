import { useEffect, useRef, useState } from 'react'
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
import { IdentityHeader } from '../components/account/IdentityHeader'
import { MoreSection } from '../components/account/more/MoreSection'
import { ProfileSection } from '../components/account/profile/ProfileSection'

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
      <Seo title={`${ACCOUNT_TITLE}`} description="Manage your Ayanfe Food Variety profile, saved addresses and account preferences." canonicalPath="/account" />
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-12 sm:py-14">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Your account</p>
            <h1 className="m-0 text-5xl font-bold tracking-[-0.05em] text-green-dark sm:text-6xl">Account</h1>
          </div>
        </section>
        <section className="container py-12 sm:py-16 lg:py-20">
          {!isAuthLoading && !user ? (
            <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm">
              <h2 className="text-3xl font-bold text-green-dark">Sign in to manage your account</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted">
                You need to be signed in to view your profile, saved addresses and preferences.
              </p>
              <button className="mt-6 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="button" onClick={() => void openAuth()}>
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
            <div className="mx-auto max-w-xl space-y-10" role="status" aria-label="Loading your account">
              <div className="space-y-3 text-center">
                <div className="mx-auto size-16 rounded-full bg-sage/60 animate-pulse" />
                <div className="mx-auto h-4 w-40 rounded bg-sage/60 animate-pulse" />
                <div className="mx-auto h-3 w-56 rounded bg-sage/40 animate-pulse" />
              </div>
              {[0, 1, 2].map((row) => (
                <div className="h-44 rounded-3xl bg-sage/60 animate-pulse" key={row} />
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-xl space-y-10">
              <IdentityHeader name={profile.name} email={profile.email} />
              <ProfileSection profile={profile} onProfileUpdated={handleProfileUpdated} />
              <AddressesSection />
              <MoreSection />
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}