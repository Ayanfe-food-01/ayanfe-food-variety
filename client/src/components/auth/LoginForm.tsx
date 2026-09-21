import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, EyeIcon, EyeOffIcon } from '../../assets/icons'
import { Button } from '../ui/Button'

export type Mode = 'login' | 'signup'

export interface AuthFormValues {
  name: string
  email: string
  password: string
  showPassword: boolean
  agreedToTerms: boolean
}

interface LoginFormProps {
  mode: Mode
  values: AuthFormValues
  isSubmitting: boolean
  error: string | null
  onChange: (patch: Partial<AuthFormValues>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onModeChange: (mode: Mode) => void
  onBack: () => void
  onForgotPassword: () => void
  onVerifyEmail: () => void
}

const inputClass = 'mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/10'

export function LoginForm({ mode, values, isSubmitting, error, onChange, onSubmit, onModeChange, onBack, onForgotPassword, onVerifyEmail }: LoginFormProps) {
  return (
    <>
      <button className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-green hover:text-orange" type="button" onClick={onBack}>
        ← Back
      </button>
      <div className="mt-5">
        <h1 className="text-3xl font-bold tracking-[-0.05em] text-green-dark">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {mode === 'login' ? 'Sign in to your account to continue.' : 'Create an account to get started.'}
        </p>
      </div>
      <form className="mt-7 space-y-5" onSubmit={onSubmit}>
        {mode === 'signup' && (
          <label className="block text-sm font-bold text-green-dark">Name<input className={inputClass} type="text" autoComplete="name" value={values.name} onChange={(event) => onChange({ name: event.target.value })} required /></label>
        )}
        <label className="block text-sm font-bold text-green-dark">Email<input className={inputClass} type="email" autoComplete="email" value={values.email} onChange={(event) => onChange({ email: event.target.value })} required /></label>
        <div>
          <div className="flex items-center justify-between gap-4 text-sm font-bold text-green-dark">
            <label htmlFor="login-password">Password</label>
            {mode === 'login' && (
              <button className="text-xs text-green hover:text-orange" type="button" onClick={onForgotPassword}>
                Forgot Password?
              </button>
            )}
          </div>
          <div className="relative mt-2">
            <input
              id="login-password"
              className="w-full rounded-xl border border-line px-4 py-3 pr-12 font-normal outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/10"
              type={values.showPassword ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={values.password}
              onChange={(event) => onChange({ password: event.target.value })}
              minLength={6}
              required
            />
            <button
              className="absolute right-3 top-1/2 grid -translate-y-1/2 place-items-center rounded-lg p-1.5 text-muted transition-colors hover:bg-sage/40 hover:text-green-dark focus:outline-none focus:ring-2 focus:ring-green/20"
              type="button"
              aria-label={values.showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={values.showPassword}
              onClick={() => onChange({ showPassword: !values.showPassword })}
            >
              {values.showPassword ? <EyeOffIcon size={19} /> : <EyeIcon size={19} />}
            </button>
          </div>
          <span className="mt-1 block text-xs font-normal text-muted">At least 6 characters.</span>
        </div>
        {mode === 'signup' && (
          <label className="flex items-start gap-2.5 text-xs leading-5 text-muted">
            <input
              className="mt-0.5 size-4 shrink-0 cursor-pointer accent-green"
              type="checkbox"
              checked={values.agreedToTerms}
              onChange={(event) => onChange({ agreedToTerms: event.target.checked })}
              required
            />
            <span>
              I agree to the&nbsp;<Link className="font-bold text-green hover:text-orange" to="/terms-and-conditions" target="_blank" rel="noreferrer">Terms &amp; Conditions</Link> and&nbsp;<Link className="font-bold text-green hover:text-orange" to="/privacy-policy" target="_blank" rel="noreferrer">Privacy Policy</Link>.
            </span>
          </label>
        )}
        {error && <p className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">{error}</p>}
        <Button fullWidth size="lg" type="submit" disabled={isSubmitting || (mode === 'signup' && !values.agreedToTerms)}>
          {isSubmitting ? (mode === 'login' ? 'Signing in…' : 'Creating…') : mode === 'login' ? 'Sign in' : 'Create account'} {!isSubmitting && <ArrowRight size={17} />}
        </Button>
      </form>
      {mode === 'login' && error?.toLowerCase().includes('verify your email') && (
        <Button className="mt-4 w-full" variant="outline" size="sm" type="button" onClick={onVerifyEmail}>
          Verify your email
        </Button>
      )}
      <Button className="mt-7 w-full text-center" variant="text" size="sm" type="button" onClick={() => onModeChange(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? 'Don\u2019t have an account? Sign up' : 'Already have an account? Sign in'}
      </Button>
      {mode === 'login' && (
        <p className="mt-4 text-center text-[11px] leading-5 text-muted">
          By continuing, you agree to our{' '}
          <Link className="font-bold text-green hover:text-orange" to="/terms-and-conditions" target="_blank" rel="noreferrer">Terms &amp; Conditions</Link> and{' '}
          <Link className="font-bold text-green hover:text-orange" to="/privacy-policy" target="_blank" rel="noreferrer">Privacy Policy</Link>.
        </p>
      )}
    </>
  )
}