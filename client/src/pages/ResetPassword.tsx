import { useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight } from '../assets/icons'
import { Button } from '../components/ui/Button'
import { ApiError } from '../services/api'
import { resetPassword } from '../services/authService'

export function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useMemo(() => new URLSearchParams(location.search).get('token') ?? '', [location.search])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReset, setIsReset] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!token) {
      setError('This password reset link is invalid or has expired.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setIsSubmitting(true)
    try {
      await resetPassword(token, newPassword, confirmPassword)
      setIsReset(true)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'We could not reset your password right now.')
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
        {isReset ? (
          <div className="mt-10">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-green">Password updated</p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em] text-green-dark">You’re all set</h1>
            <p className="mt-3 text-sm leading-6 text-muted">Your password has been reset successfully. Sign in with your new password to continue.</p>
            <Button className="mt-8 w-full" size="lg" type="button" onClick={() => navigate('/login', { replace: true })}>
              Continue to sign in <ArrowRight size={17} />
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-10">
              <h1 className="text-4xl font-bold tracking-[-0.05em] text-green-dark">Set a new password</h1>
              <p className="mt-3 text-sm leading-6 text-muted">Choose a secure password for your Ayanfe Food Variety account.</p>
            </div>
            <form className="mt-8 space-y-5" onSubmit={submit}>
              <label className="block text-sm font-bold text-green-dark">
                New password
                <input
                  className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/10"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={12}
                  maxLength={256}
                  required
                />
                <span className="mt-1 block text-xs font-normal text-muted">At least 12 characters.</span>
              </label>
              <label className="block text-sm font-bold text-green-dark">
                Confirm new password
                <input
                  className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/10"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={12}
                  maxLength={256}
                  required
                />
              </label>
              {error && <p className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">{error}</p>}
              <Button fullWidth size="lg" type="submit" disabled={isSubmitting || !token}>
                {isSubmitting ? 'Resetting…' : 'Reset password'} {!isSubmitting && <ArrowRight size={17} />}
              </Button>
            </form>
          </>
        )}
        <Link className="mt-7 block text-center text-xs font-bold text-muted hover:text-green" to="/login">Return to sign in</Link>
      </section>
    </main>
  )
}