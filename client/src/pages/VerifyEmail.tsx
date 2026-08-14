import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight } from '../assets/icons'
import { Button } from '../components/ui/Button'
import { ApiError } from '../services/api'
import { resendCustomerVerification, verifyCustomerEmail } from '../services/authService'

interface VerificationLocationState {
  email?: unknown
  verificationExpiresInSeconds?: unknown
}

const DEFAULT_EXPIRY_SECONDS = 10 * 60
const RESEND_COOLDOWN_SECONDS = 60

const readLocationState = (value: unknown): VerificationLocationState =>
  typeof value === 'object' && value !== null ? value as VerificationLocationState : {}

const formatCountdown = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function VerifyEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = useMemo(() => readLocationState(location.state), [location.state])
  const verificationQuery = useMemo(() => new URLSearchParams(location.search), [location.search])
  const queryEmail = verificationQuery.get('email') ?? ''
  const queryExpiry = Number(verificationQuery.get('verification_expires_in'))
  const initialEmail = typeof locationState.email === 'string' ? locationState.email : queryEmail
  const initialExpiry = typeof locationState.verificationExpiresInSeconds === 'number'
    ? locationState.verificationExpiresInSeconds
    : Number.isFinite(queryExpiry) && queryExpiry > 0 ? queryExpiry : DEFAULT_EXPIRY_SECONDS
  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')
  const [secondsRemaining, setSecondsRemaining] = useState(initialExpiry)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(
    verificationQuery.get('oauth') === 'google'
      ? 'Your Google account was created. Enter the verification code sent to your email.'
      : null,
  )

  useEffect(() => {
    if (secondsRemaining <= 0) return
    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [secondsRemaining])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setNotice(null)
    if (!email.trim()) {
      setError('Enter the email address you used to create your account.')
      return
    }
    setIsVerifying(true)
    try {
      await verifyCustomerEmail(email, otp)
      setIsVerified(true)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'We could not verify that code right now.')
    } finally {
      setIsVerifying(false)
    }
  }

  const resend = async () => {
    setError(null)
    setNotice(null)
    if (!email.trim()) {
      setError('Enter the email address you used to create your account.')
      return
    }
    setIsResending(true)
    try {
      const result = await resendCustomerVerification(email)
      setSecondsRemaining(result.verificationExpiresInSeconds)
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setOtp('')
      setNotice('If the account requires verification, a new code has been sent.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'We could not send a new code right now.')
    } finally {
      setIsResending(false)
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
        {isVerified ? (
          <div className="mt-10">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-green">Email verified</p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em] text-green-dark">You’re all set</h1>
            <p className="mt-3 text-sm leading-6 text-muted">Your email has been verified. Sign in to continue to your Ayanfe Food Variety account.</p>
            <Button className="mt-8 w-full" size="lg" type="button" onClick={() => navigate('/login', { replace: true, state: { email } })}>
              Continue to sign in <ArrowRight size={17} />
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-10">
              <h1 className="text-4xl font-bold tracking-[-0.05em] text-green-dark">Verify your email</h1>
              <p className="mt-3 text-sm leading-6 text-muted">We sent a 6-digit code to your email address. Enter it below to verify your account.</p>
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
              <label className="block text-sm font-bold text-green-dark">
                6-digit verification code
                <input
                  className="mt-2 w-full rounded-xl border border-line px-4 py-3 text-center text-2xl font-bold tracking-[0.35em] outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/10"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
              </label>
              <p className={`text-sm ${secondsRemaining > 0 ? 'text-muted' : 'font-bold text-orange'}`} aria-live="polite">
                {secondsRemaining > 0 ? `Code expires in ${formatCountdown(secondsRemaining)}.` : 'This code has expired. Request a new code.'}
              </p>
              {error && <p className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">{error}</p>}
              {notice && <p className="rounded-xl border border-green/20 bg-green/5 px-4 py-3 text-sm text-green-dark" role="status">{notice}</p>}
              <Button fullWidth size="lg" type="submit" disabled={isVerifying || otp.length !== 6}>
                {isVerifying ? 'Checking code…' : 'Verify email'} {!isVerifying && <ArrowRight size={17} />}
              </Button>
            </form>
            <Button
              className="mt-4 w-full"
              variant="outline"
              size="sm"
              type="button"
              disabled={isResending || resendCooldown > 0}
              onClick={resend}
            >
              {isResending
                ? 'Sending new code…'
                : resendCooldown > 0
                  ? `Resend available in ${formatCountdown(resendCooldown)}`
                  : 'Resend OTP'}
            </Button>
            <p className="mt-5 text-center text-xs leading-5 text-muted">For your security, never share your verification code with anyone.</p>
          </>
        )}
        <Link className="mt-7 block text-center text-xs font-bold text-muted hover:text-green" to="/login">Return to sign in</Link>
      </section>
    </main>
  )
}