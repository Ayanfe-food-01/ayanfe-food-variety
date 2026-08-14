import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, EyeIcon, EyeOffIcon } from '../assets/icons'
import { Button } from '../components/ui/Button'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { ApiError } from '../services/api'
import { login, signupCustomer, getCurrentUser, type AuthenticatedUser } from '../services/authService'

type Mode = 'login' | 'signup'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { completeAuthentication } = useCustomerAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => {
        navigate(currentUser.role === 'ADMIN' ? '/admin' : '/', { replace: true })
      })
      .catch((caught: unknown) => {
        if (!(caught instanceof ApiError && caught.status === 401)) setError('We could not check your existing session.')
      })
  }, [navigate])

  const getDestination = (user: AuthenticatedUser) => {
    const from = location.state && typeof location.state === 'object' && 'from' in location.state && typeof location.state.from === 'string'
      ? location.state.from
      : '/'
    return user.role === 'ADMIN'
      ? from.startsWith('/admin') ? from : '/admin'
      : from.startsWith('/admin') ? '/' : from
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      if (mode === 'signup') {
        const result = await signupCustomer(name, email, password)
        navigate('/verify-email', {
          replace: true,
          state: {
            email: result.user.email,
            verificationExpiresInSeconds: result.verificationExpiresInSeconds,
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

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border border-line bg-white p-7 shadow-sm sm:p-9">
        <div className="flex justify-center">
          <Link to="/" aria-label="Return to storefront">
            <img className="h-20 w-20 object-contain" src="/branding/ayanfe-food-variety-logo.png" alt="Ayanfe Food Variety logo" />
          </Link>
        </div>
        <div className="mt-10">
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
              {mode === 'login' && <Link className="text-xs text-green hover:text-orange" to="/forgot-password">Forgot Password?</Link>}
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
            {isSubmitting ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'} {!isSubmitting && <ArrowRight size={17} />}
          </Button>
        </form>
        {mode === 'login' && error?.toLowerCase().includes('verify your email') && (
          <Button
            className="mt-4 w-full"
            variant="outline"
            size="sm"
            type="button"
            onClick={() => navigate('/verify-email', { state: { email: email.trim().toLowerCase() } })}
          >
            Verify your email
          </Button>
        )}
        <Button
          className="mt-7 w-full text-center"
          variant="text"
          size="sm"
          type="button"
          onClick={() => { setMode((current) => current === 'login' ? 'signup' : 'login'); setError(null) }}
        >
          {mode === 'login' ? 'Don’t have an account? Sign up' : 'Already have an account? Login'}
        </Button>
        <Link className="mt-4 block text-center text-xs font-bold text-muted hover:text-green" to="/">Return to storefront</Link>
      </section>
    </main>
  )
}