import { useEffect, useState, type FormEvent } from 'react'
import { CloseIcon, MailIcon, ShieldIcon } from '../../assets/icons'
import { ApiError } from '../../services/api'
import {
  getCustomerProviders,
  loginCustomer,
  signupCustomer,
  type CustomerUser,
} from '../../services/authService'

interface CustomerAuthModalProps {
  onClose: () => void
  onAuthenticated: (user: CustomerUser) => void
}

type Mode = 'login' | 'signup'

export function CustomerAuthModal({ onClose, onAuthenticated }: CustomerAuthModalProps) {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [googleMessage, setGoogleMessage] = useState('Google sign-in is not configured.')

  useEffect(() => {
    getCustomerProviders()
      .then(({ google, message }) => {
        setGoogleMessage(google ? 'Google sign-in is configured but not enabled in this environment.' : message)
      })
      .catch(() => {
        // The email flow remains available if provider discovery is unavailable.
      })
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const user = mode === 'login'
        ? await loginCustomer(email, password)
        : await signupCustomer(name, email, password)
      onAuthenticated(user)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'We couldn’t sign you in right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const switchMode = () => {
    setMode((current) => current === 'login' ? 'signup' : 'login')
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-green-dark/35 px-5 py-8" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="relative w-full max-w-md rounded-3xl border border-line bg-white p-7 shadow-2xl sm:p-9" role="dialog" aria-modal="true" aria-labelledby="customer-auth-heading">
        <button className="absolute right-5 top-5 grid size-9 place-items-center rounded-full text-muted hover:bg-sage hover:text-green" type="button" aria-label="Close authentication dialog" onClick={onClose}>
          <CloseIcon size={19} />
        </button>
        <div className="flex items-center gap-2 text-orange">
          <ShieldIcon size={18} />
          <span className="text-xs font-bold uppercase tracking-[0.16em]">Your account</span>
        </div>
        <h2 id="customer-auth-heading" className="mt-3 text-3xl font-bold tracking-[-0.05em] text-green-dark">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
          {mode === 'login' ? 'Sign in to continue shopping with your cart saved.' : 'Create an account to keep your cart and orders together.'}
        </p>

        <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-cream py-3.5 text-sm font-bold text-muted" type="button" disabled title="Google OAuth is not configured">
          <span className="font-display text-base font-bold">G</span>
          Continue with Google
        </button>
        <p className="mt-2 text-center text-xs leading-5 text-muted">{googleMessage}</p>

        <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or continue with email<span className="h-px flex-1 bg-line" /></div>
        <form className="space-y-4" onSubmit={submit}>
          {mode === 'signup' && (
            <label className="block text-sm font-bold text-green-dark">Name<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></label>
          )}
          <label className="block text-sm font-bold text-green-dark">Email<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label className="block text-sm font-bold text-green-dark">Password<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} required /><span className="mt-1 block text-xs font-normal text-muted">At least 12 characters.</span></label>
          {error && <p className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">{error}</p>}
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green py-3.5 text-sm font-bold text-cream hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={isSubmitting}>
            <MailIcon size={16} /> {isSubmitting ? 'Please wait…' : mode === 'login' ? 'Continue with Email' : 'Create account'}
          </button>
        </form>
        <button className="mt-5 w-full text-center text-xs font-bold text-green hover:text-orange" type="button" onClick={switchMode}>
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
      </section>
    </div>
  )
}