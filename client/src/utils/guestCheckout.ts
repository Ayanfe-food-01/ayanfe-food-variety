const GUEST_CHECKOUT_STORAGE_KEY = 'ayanfe-guest-checkout'

export const markGuestCheckout = (): void => {
  try {
    window.sessionStorage.setItem(GUEST_CHECKOUT_STORAGE_KEY, 'true')
  } catch {
    // Router state still supports the current navigation when storage is unavailable.
  }
}

export const isGuestCheckoutMarked = (): boolean => {
  try {
    return window.sessionStorage.getItem(GUEST_CHECKOUT_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export const clearGuestCheckout = (): void => {
  try {
    window.sessionStorage.removeItem(GUEST_CHECKOUT_STORAGE_KEY)
  } catch {
    // Nothing to clear when session storage is unavailable.
  }
}