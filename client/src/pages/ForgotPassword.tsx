import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from '../assets/icons'
import { Button } from '../components/ui/Button'
import { ApiError } from '../services/api'
import { requestPasswordReset } from '../services/authService'
import { BrandLogo } from '../components/layout/BrandLogo'

const GENERIC_MESSAGE = "If an account exists with this email, we've sent password reset instructions."

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await requestPasswordReset(email)
      setIsSubmitted(true)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'We could not send reset instructions right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page-shell grid place-items-center bg-cream px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border border-line bg-white p-7 shadow-sm sm:p-9">
        <div className="flex justify-center">
          <Link to="/" aria-label="Return to storefront">
            <BrandLogo className="h-20 w-20 object-contain" />
          </Link>
        </div>
        {isSubmitted ? (
          <div className="mt-10">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-green">Check your inbox</p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em] text-green-dark">Reset link requested</h1>
            <p className="mt-3 text-sm leading-6 text-muted">{GENERIC_MESSAGE}</p>
            <p className="mt-3 text-sm leading-6 text-muted">The link will expire soon. If you don’t see it, check your spam folder.</p>
            <Button className="mt-8 w-full" size="lg" type="button" onClick={() => setIsSubmitted(false)}>
              Try another email <ArrowRight size={17} />
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-10">
              <h1 className="text-4xl font-bold tracking-[-0.05em] text-green-dark">Forgot your password?</h1>
              <p className="mt-3 text-sm leading-6 text-muted">Enter your email and we’ll send you instructions to reset your password.</p>
            </div>
            <form className="mt-8 space-y-5" onSubmit={submit}>
              <label className="block text-sm font-bold text-green-dark">
                Email
                <input
                  className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/10"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              {error && <p className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">{error}</p>}
              <Button fullWidth size="lg" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send reset link'} {!isSubmitting && <ArrowRight size={17} />}
              </Button>
            </form>
          </>
        )}
        <Link className="mt-7 block text-center text-xs font-bold text-muted hover:text-green" to="/login">Return to sign in</Link>
      </section>
    </main>
  )
}