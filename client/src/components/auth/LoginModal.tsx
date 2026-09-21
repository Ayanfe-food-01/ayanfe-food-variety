import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { ApiError } from '../../services/api'
import { getCurrentUser, getGoogleSignInUrl, login, signupCustomer, type AuthenticatedUser } from '../../services/authService'
import {
  clearAuthReturnPath,
  isCheckoutReturnPath,
  readInternalReturnPath,
  storeAuthReturnPath,
} from '../../utils/authReturn'
import { markGuestCheckout } from '../../utils/guestCheckout'
import { lockBodyScroll } from '../../utils/browserCompatibility'
import { BrandLogo } from '../layout/BrandLogo'
import { AuthModalShell } from './AuthModalShell'
import { AuthGatewayView } from './AuthGatewayView'
import { LoginForm, type AuthFormValues, type Mode } from './LoginForm'

type LoginView = 'gateway' | 'email'

const googleErrorMessages: Record<string, string> = {
  google_cancelled: 'Google sign-in was cancelled.',
  google_unavailable: 'Google sign-in is not available right now. Please use email and password.',
  google_failed: 'Google sign-in could not be completed. Please try again or use email and password.',
  google_admin_forbidden: 'This Google account is not authorized for administrator access.',
}

const FOCUSABLE_SELECTOR = 'a, button, input, [tabindex]:not([tabindex="-1"])'

const ADMIN_EXPIRY_NOTICE = 'Your admin session has expired due to inactivity. Please sign in again.'

interface LoginModalProps {
  standalone?: boolean
}

export function LoginModal({ standalone = false }: LoginModalProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { completeAuthentication, completeGuestContinuation, closeAuth } = useCustomerAuth()
  const initialReturnPath = readInternalReturnPath(location.state)
  const initialGoogleError = new URLSearchParams(location.search).get('oauth_error')
  const initialExpiryNotice = location.pathname === '/admin/login' && new URLSearchParams(location.search).get('reason') === 'expired'
  const [view, setView] = useState<LoginView>(() => {
    const state = location.state
    return (state && typeof state === 'object' && 'email' in state) || initialReturnPath.startsWith('/admin') || location.pathname === '/admin/login'
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
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(() => {
    if (initialExpiryNotice) return ADMIN_EXPIRY_NOTICE
    return initialGoogleError && googleErrorMessages[initialGoogleError]
      ? googleErrorMessages[initialGoogleError]
      : null
  })
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const getDestination = useCallback((user: AuthenticatedUser) => {
    const from = readInternalReturnPath(location.state)
    clearAuthReturnPath()
    return user.role === 'ADMIN'
      ? from.startsWith('/admin') ? from : '/admin'
      : from.startsWith('/admin') ? '/' : from
  }, [location.state])

  const handleClose = useCallback(() => {
    if (standalone) {
      navigate(readInternalReturnPath(location.state), { replace: true })
      return
    }
    closeAuth()
  }, [closeAuth, location.state, navigate, standalone])

  useEffect(() => {
    if (!standalone) return
    let isCurrent = true
    getCurrentUser()
      .then((currentUser) => {
        if (isCurrent) navigate(getDestination(currentUser), { replace: true })
      })
      .catch((caught: unknown) => {
        if (isCurrent && !(caught instanceof ApiError && caught.status === 401)) setError('We could not check your existing session.')
      })
    return () => {
      isCurrent = false
    }
  }, [getDestination, navigate, standalone])

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const releaseBodyScroll = lockBodyScroll()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleClose()
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute('disabled'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    return () => {
      releaseBodyScroll()
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [handleClose])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      if (mode === 'signup') {
        const from = readInternalReturnPath(location.state)
        storeAuthReturnPath(from)
        const result = await signupCustomer(name, email, password)
        if (!standalone) closeAuth()
        navigate('/verify-email', {
          replace: true,
          state: {
            email: result.user.email,
            verificationExpiresInSeconds: result.verificationExpiresInSeconds,
            from,
          },
        })
        return
      }
      const user = await login(email, password)
      completeAuthentication(user)
      if (standalone) {
        navigate(getDestination(user), { replace: true })
      } else if (user.role === 'ADMIN') {
        closeAuth()
        navigate(getDestination(user), { replace: true })
      } else {
        clearAuthReturnPath()
        closeAuth()
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to complete authentication right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFormChange = (patch: Partial<AuthFormValues>) => {
    if ('name' in patch) setName(patch.name ?? '')
    if ('email' in patch) setEmail(patch.email ?? '')
    if ('password' in patch) setPassword(patch.password ?? '')
    if ('showPassword' in patch) setShowPassword(patch.showPassword ?? false)
    if ('agreedToTerms' in patch) setAgreedToTerms(patch.agreedToTerms ?? false)
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
    if (standalone) {
      navigate(destination, { replace: true, state: { guestCheckout: true } })
    } else {
      closeAuth()
    }
  }

  const openForgotPassword = () => {
    if (!standalone) closeAuth()
    navigate('/forgot-password', { state: { from: readInternalReturnPath(location.state) } })
  }

  const openVerifyEmail = () => {
    if (!standalone) closeAuth()
    navigate('/verify-email', { state: { email: email.trim().toLowerCase() } })
  }

  return (
    <AuthModalShell label="Sign in" onClose={handleClose} panelRef={panelRef} closeButtonRef={closeButtonRef}>
      <div className="px-5 pb-[max(1.5rem,calc(1.5rem+env(safe-area-inset-bottom)))] sm:px-8">
        <div className="flex justify-center">
          <BrandLogo className="h-20 w-20 object-contain" />
        </div>
        {view === 'gateway' ? (
          <AuthGatewayView
            error={error}
            isSubmitting={isSubmitting}
            onContinueEmail={() => { setView('email'); setError(null) }}
            onContinueGoogle={continueWithGoogle}
            onContinueGuest={continueAsGuest}
          />
        ) : (
          <LoginForm
            mode={mode}
            values={{ name, email, password, showPassword, agreedToTerms }}
            isSubmitting={isSubmitting}
            error={error}
            onChange={handleFormChange}
            onSubmit={submit}
            onModeChange={(nextMode) => { setMode(nextMode); setError(null) }}
            onBack={() => { setView('gateway'); setMode('login'); setError(null) }}
            onForgotPassword={openForgotPassword}
            onVerifyEmail={openVerifyEmail}
          />
        )}
        {standalone && (
          <button className="mt-7 block w-full text-center text-xs font-bold text-muted hover:text-green" type="button" onClick={handleClose}>
            Return to storefront
          </button>
        )}
      </div>
    </AuthModalShell>
  )
}