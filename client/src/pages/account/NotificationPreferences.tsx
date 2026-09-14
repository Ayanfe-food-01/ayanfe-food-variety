import { MailIcon, PhoneIcon, BellIcon } from '../../assets/icons'
import { Footer } from '../../components/layout/Footer'
import { Navbar } from '../../components/layout/Navbar'
import { AccountSection } from '../../components/account/AccountSection'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { useCustomerAccountProfile } from '../../hooks/useCustomerAccountProfile'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'

function PreferenceRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sage/60 text-green">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-green-dark">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted">{value}</p>
      </div>
    </div>
  )
}

export function NotificationPreferences() {
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
            <h1 className="m-0 text-5xl font-bold tracking-[-0.05em] text-green-dark sm:text-6xl">Notification preferences</h1>
            <p className="mt-4 text-base text-muted">Where we send updates about your orders.</p>
          </div>
        </section>
        <section className="container py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-2xl">
            {!isAuthLoading && !user ? (
              <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm">
                <h2 className="text-3xl font-bold text-green-dark">Sign in to view your preferences</h2>
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
              <AccountSection label="Where updates go">
                <div className="divide-y divide-line">
                  <PreferenceRow
                    icon={<BellIcon size={18} />}
                    label="Order updates"
                    value="Order confirmations, payment status and tracking updates."
                  />
                  <PreferenceRow
                    icon={<MailIcon size={18} />}
                    label="Email"
                    value={profile.email}
                  />
                  <PreferenceRow
                    icon={<PhoneIcon size={18} />}
                    label="Phone (SMS)"
                    value={profile.phone || 'Not added'}
                  />
                </div>
                <p className="mt-6 rounded-2xl border border-line bg-cream px-4 py-3 text-xs leading-5 text-muted">
                  Messages are sent to your account email{profile.phone ? ' and phone number' : ''} above.
                  Contact us if you need to update how you receive notifications.
                </p>
              </AccountSection>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}