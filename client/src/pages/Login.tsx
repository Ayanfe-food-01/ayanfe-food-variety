import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, EyeIcon, EyeOffIcon } from '../assets/icons'
import { Button } from '../components/ui/Button'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { ApiError } from '../services/api'
import { getGoogleSignInUrl, login, signupCustomer, getCurrentUser, type AuthenticatedUser } from '../services/authService'
import {
  clearAuthReturnPath,
  isCheckoutReturnPath,
  readInternalReturnPath,
  storeAuthReturnPath,
} from '../utils/authReturn'
import { markGuestCheckout } from '../utils/guestCheckout'

type Mode = 'login' | 'signup'
type LoginView = 'gateway' | 'email'

const googleErrorMessages: Record<string, string> = {
  google_cancelled: 'Google sign-in was cancelled.',
  google_unavailable: 'Google sign-in is not available right now. Please use email and password.',
  google_failed: 'Google sign-in could not be completed. Please try again or use email and password.',
}

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { completeAuthentication, completeGuestContinuation } = useCustomerAuth()
  const initialReturnPath = readInternalReturnPath(location.state)
  const initialGoogleError = new URLSearchParams(location.search).get('oauth_error')
  const [view, setView] = useState<LoginView>(() => {
    const state = location.state
    return (state && typeof state === 'object' && 'email' in state) || initialReturnPath.startsWith('/admin')
      ? 'email'
      : 'gateway'
  })
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState(() => {
    const state = location.state
    return state && typeof state === 'object' && 'email' in state && typeof state.email === 'string' ? state.email : ''
  })
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(() => (
    initialGoogleError && googleErrorMessages[initialGoogleError]
      ? googleErrorMessages[initialGoogleError]
      : null
  ))

  const getDestination = useCallback((user: AuthenticatedUser) => {
    const from = readInternalReturnPath(location.state)
    clearAuthReturnPath()
    return user.role === 'ADMIN'
      ? from.startsWith('/admin') ? from : '/admin'
      : from.startsWith('/admin') ? '/' : from
  }, [location.state])

  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => {
        navigate(getDestination(currentUser), { replace: true })
      })
      .catch((caught: unknown) => {
        if (!(caught instanceof ApiError && caught.status === 401)) setError('We could not check your existing session.')
      })
  }, [getDestination, navigate])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      if (mode === 'signup') {
        storeAuthReturnPath(readInternalReturnPath(location.state))
        const result = await signupCustomer(name, email, password)
        navigate('/verify-email', {
          replace: true,
          state: {
            email: result.user.email,
            verificationExpiresInSeconds: result.verificationExpiresInSeconds,
            from: readInternalReturnPath(location.state),
          },
        })
        return
      }
      const user = await login(email, password)
      completeAuthentication(user)
      navigate(getDestination(user), { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to complete authentication right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const continueWithGoogle = () => {
    setError(null)
    setIsSubmitting(true)
    storeAuthReturnPath(readInternalReturnPath(location.state))
    window.location.assign(getGoogleSignInUrl())
  }

  const continueAsGuest = () => {
    const destination = readInternalReturnPath(location.state)
    if (!isCheckoutReturnPath(destination) && destination !== '/') {
      setError('Guest checkout is only available when placing an order. Please sign in to continue.')
      return
    }
    if (isCheckoutReturnPath(destination)) markGuestCheckout()
    completeGuestContinuation()
    clearAuthReturnPath()
    navigate(destination, { replace: true, state: { guestCheckout: true } })
  }

  return (
    <main className="auth-page-shell grid place-items-center bg-cream px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border border-line bg-white p-7 shadow-sm sm:p-9">
        <div className="flex justify-center">
          <Link to="/" aria-label="Return to storefront">
            <img className="h-20 w-20 object-contain" src="/branding/ayanfe-food-variety-logo.png" alt="Ayanfe Food Variety logo" />
          </Link>
        </div>
        {view === 'gateway' ? (
          <>
            <div className="mt-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Your account, your choice</p>
              <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em] text-green-dark">How would you like to continue?</h1>
              <p className="mt-3 text-sm leading-6 text-muted">Sign in for account features or continue as a guest to place your order.</p>
            </div>
            <div className="mt-8 space-y-3">
              <Button fullWidth size="lg" type="button" onClick={() => { setView('email'); setError(null) }}>
                Continue with Email <ArrowRight size={17} />
              </Button>
              <Button fullWidth variant="outline" size="lg" type="button" disabled={isSubmitting} onClick={continueWithGoogle}>
                <img className="size-5" src="/branding/google-icon.svg" alt="" aria-hidden="true" />
                Continue with Google
              </Button>
              <Button fullWidth variant="outline" size="lg" type="button" onClick={continueAsGuest}>
                Continue as Guest <ArrowRight size={17} />
              </Button>
            </div>
            {error && <p className="mt-5 rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">{error}</p>}
          </>
        ) : (
          <>
            <button className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-green hover:text-orange" type="button" onClick={() => { setView('gateway'); setMode('login'); setError(null) }}>
              ← Back
            </button>
            <div className="mt-7">
              <h1 className="text-4xl font-bold tracking-[-0.05em] text-green-dark">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                {mode === 'login' ? 'Sign in to your account to continue.' : 'Create an account to get started.'}
              </p>
            </div>
            <form className="mt-8 space-y-5" onSubmit={submit}>
              {mode === 'signup' && (
                <label className="block text-sm font-bold text-green-dark">Name<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/10" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></label>
              )}
              <label className="block text-sm font-bold text-green-dark">Email<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/10" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              <div>
                <div className="flex items-center justify-between gap-4 text-sm font-bold text-green-dark">
                  <label htmlFor="login-password">Password</label>
                  {mode === 'login' && (
                    <Link
                      className="text-xs text-green hover:text-orange"
                      to="/forgot-password"
                      state={{ from: readInternalReturnPath(location.state) }}
                    >
                      Forgot Password?
                    </Link>
                  )}
                </div>
                <div className="relative mt-2">
                  <input id="login-password" className="w-full rounded-xl border border-line px-4 py-3 pr-12 font-normal outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/10" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
                  <button
                    className="absolute right-3 top-1/2 grid -translate-y-1/2 place-items-center rounded-lg p-1.5 text-muted transition-colors hover:bg-sage/40 hover:text-green-dark focus:outline-none focus:ring-2 focus:ring-green/20"
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOffIcon size={19} /> : <EyeIcon size={19} />}
                  </button>
                </div>
                <span className="mt-1 block text-xs font-normal text-muted">At least 6 characters.</span>
              </div>
              {error && <p className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">{error}</p>}
              <Button fullWidth size="lg" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (mode === 'login' ? 'Signing in…' : 'Creating…') : mode === 'login' ? 'Sign in' : 'Create account'} {!isSubmitting && <ArrowRight size={17} />}
              </Button>
            </form>
            {mode === 'login' && error?.toLowerCase().includes('verify your email') && (
              <Button className="mt-4 w-full" variant="outline" size="sm" type="button" onClick={() => navigate('/verify-email', { state: { email: email.trim().toLowerCase() } })}>
                Verify your email
              </Button>
            )}
            <Button className="mt-7 w-full text-center" variant="text" size="sm" type="button" onClick={() => { setMode((current) => current === 'login' ? 'signup' : 'login'); setError(null) }}>
              {mode === 'login' ? 'Don’t have an account? Sign up' : 'Already have an account? Sign in'}
            </Button>
          </>
        )}
        <Link className="mt-7 block text-center text-xs font-bold text-muted hover:text-green" to="/">Return to storefront</Link>
      </section>
    </main>
  )
}