import { Footer } from '../../components/layout/Footer'
import { Navbar } from '../../components/layout/Navbar'
import { AccountSection } from '../../components/account/AccountSection'
import { ChangePasswordForm } from '../../components/account/security/ChangePasswordForm'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { useCustomerAccountProfile } from '../../hooks/useCustomerAccountProfile'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'

export function ChangePassword() {
  const { user, isLoading: isAuthLoading, openAuth } = useCustomerAuth()
  const { state: profileState, retry } = useCustomerAccountProfile(!isAuthLoading && Boolean(user))
  const profile = profileState.status === 'ready' ? profileState.profile : null
  const profileError = profileState.status === 'error' ? profileState.error : null

  useInitialRouteLoad(!isAuthLoading && (!user || profileState.status !== 'loading'))

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-12 sm:py-14">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Your account</p>
            <h1 className="m-0 text-5xl font-bold tracking-[-0.05em] text-green-dark sm:text-6xl">Change password</h1>
          </div>
        </section>
        <section className="container py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-xl">
            {!isAuthLoading && !user ? (
              <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm">
                <h2 className="text-3xl font-bold text-green-dark">Sign in to change your password</h2>
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
                  onClick={retry}
                >
                  Retry loading your account
                </button>
              </div>
            ) : !profile || isAuthLoading ? (
              <div className="h-44 rounded-3xl bg-sage/60 animate-pulse" role="status" aria-label="Loading your account" />
            ) : (
              <AccountSection label="Security">
                <ChangePasswordForm canUsePassword={profile.authProvider !== 'GOOGLE' && profile.hasPassword} />
              </AccountSection>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}