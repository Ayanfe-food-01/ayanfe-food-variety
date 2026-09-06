import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import type { AuthenticatedUser } from '../../services/authService'
import { clearGuestCheckout, isGuestCheckoutMarked, markGuestCheckout } from '../../utils/guestCheckout'

export function useGuestCheckout(user: AuthenticatedUser | null) {
  const location = useLocation()

  const guestCheckout = Boolean(
    !user
    && (
      isGuestCheckoutMarked()
      || (
        location.state
        && typeof location.state === 'object'
        && 'guestCheckout' in location.state
        && location.state.guestCheckout === true
      )
    ),
  )

  useEffect(() => {
    if (guestCheckout) markGuestCheckout()
    if (user) clearGuestCheckout()
  }, [guestCheckout, user])

  return { guestCheckout }
}