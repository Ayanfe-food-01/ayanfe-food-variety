import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, ShieldIcon } from '../../assets/icons'
import { ApiError } from '../../services/api'
import { getCurrentAdmin, loginAdmin } from '../../services/authService'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true
    getCurrentAdmin()
      .then(() => {
        if (isCurrent) navigate('/admin', { replace: true })
      })
      .catch((caught: unknown) => {
        if (isCurrent && caught instanceof ApiError && caught.status !== 401) {
          setError(caught.message)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [navigate])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      await loginAdmin(email, password)
      const from = location.state && typeof location.state === 'object' && 'from' in location.state && typeof location.state.from === 'string'
        ? location.state.from
        : '/admin'
      navigate(from, { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to sign in right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border border-line bg-white p-7 shadow-sm sm:p-9">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-green font-display text-lg font-bold text-cream">A</span>
          <div>
            <p className="m-0 text-sm font-bold text-green-dark">Ayanfe Food Variety</p>
            <p className="m-0 mt-0.5 text-xs text-muted">Admin portal</p>
          </div>
        </div>
        <div className="mt-10">
          <div className="flex items-center gap-2 text-orange"><ShieldIcon size={18} /><span className="text-xs font-bold uppercase tracking-[0.16em]">Secure sign in</span></div>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em] text-green-dark">Welcome back</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Sign in with your administrator account to manage store operations.</p>
        </div>
        <form className="mt-8 space-y-5" onSubmit={submit}>
          <label className="block text-sm font-bold text-green-dark">Email<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/10" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label className="block text-sm font-bold text-green-dark">Password<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/10" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">{error}</p>}
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green py-3.5 text-sm font-bold text-cream transition-colors hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'} {!isSubmitting && <ArrowRight size={17} />}
          </button>
        </form>
        <a className="mt-7 block text-center text-xs font-bold text-green hover:text-orange" href="/">Return to storefront</a>
      </section>
    </main>
  )
}