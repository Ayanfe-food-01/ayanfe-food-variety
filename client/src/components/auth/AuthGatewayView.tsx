import { ArrowRight } from '../../assets/icons'
import { Button } from '../ui/Button'

interface AuthGatewayViewProps {
  error: string | null
  isSubmitting: boolean
  onContinueEmail: () => void
  onContinueGoogle: () => void
  onContinueGuest: () => void
}

export function AuthGatewayView({ error, isSubmitting, onContinueEmail, onContinueGoogle, onContinueGuest }: AuthGatewayViewProps) {
  return (
    <>
      <div className="mt-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Welcome</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-green-dark">How would you like to continue?</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Sign in for account features or continue as a guest to place your order.</p>
      </div>
      <div className="mt-7 space-y-3">
        <Button fullWidth size="lg" type="button" onClick={onContinueEmail}>
          Continue with Email <ArrowRight size={17} />
        </Button>
        <Button fullWidth variant="outline" size="lg" type="button" disabled={isSubmitting} onClick={onContinueGoogle}>
          <img className="size-5" src="/branding/google-icon.svg" alt="" aria-hidden="true" />
          Continue with Google
        </Button>
        <Button fullWidth variant="outline" size="lg" type="button" onClick={onContinueGuest}>
          Continue as Guest <ArrowRight size={17} />
        </Button>
      </div>
      {error && <p className="mt-5 rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">{error}</p>}
    </>
  )
}