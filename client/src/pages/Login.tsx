import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, ShieldIcon } from '../assets/icons'
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
      const user = mode === 'login'
        ? await login(email, password)
        : await signupCustomer(name, email, password)
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
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Return to storefront">
            <img className="h-20 w-20 object-contain" src="/branding/ayanfe-food-variety-logo.png" alt="Ayanfe Food Variety logo" />
          </Link>
          <p className="m-0 text-xs text-muted">One secure account for shopping and store management</p>
        </div>
        <div className="mt-10">
          <div className="flex items-center gap-2 text-orange"><ShieldIcon size={18} /><span className="text-xs font-bold uppercase tracking-[0.16em]">Secure sign in</span></div>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em] text-green-dark">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            {mode === 'login' ? 'Sign in to continue shopping. Administrators will be taken to the store portal automatically.' : 'Create a customer account to save your cart and keep track of orders.'}
          </p>
        </div>
        <form className="mt-8 space-y-5" onSubmit={submit}>
          {mode === 'signup' && (
            <label className="block text-sm font-bold text-green-dark">Name<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/10" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></label>
          )}
          <label className="block text-sm font-bold text-green-dark">Email<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/10" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label className="block text-sm font-bold text-green-dark">Password<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/10" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} required /><span className="mt-1 block text-xs font-normal text-muted">At least 12 characters.</span></label>
          {error && <p className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">{error}</p>}
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green py-3.5 text-sm font-bold text-cream transition-colors hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'} {!isSubmitting && <ArrowRight size={17} />}
          </button>
        </form>
        <button className="mt-7 w-full text-center text-xs font-bold text-green hover:text-orange" type="button" onClick={() => { setMode((current) => current === 'login' ? 'signup' : 'login'); setError(null) }}>
          {mode === 'login' ? 'Don’t have an account? Sign up' : 'Already have an account? Login'}
        </button>
        <Link className="mt-4 block text-center text-xs font-bold text-muted hover:text-green" to="/">Return to storefront</Link>
      </section>
    </main>
  )
}