import { createRequestKey } from '../../utils/browserCompatibility'
import { initialCheckoutForm } from './checkoutValidation'
import type { CheckoutFormData } from './types'

export const CHECKOUT_DRAFT_STORAGE_KEY = 'ayanfe-checkout-draft'
export const CHECKOUT_KEY_STORAGE_KEY = 'ayanfe-checkout-key'
export const GUEST_ACCESS_TOKEN_STORAGE_KEY = 'ayanfe-guest-access-token'

export const readSessionValue = (key: string): string | null => {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export const writeSessionValue = (key: string, value: string): void => {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // Checkout remains usable for this tab if session storage is unavailable.
  }
}

export const clearSessionValue = (key: string): void => {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // Nothing to clear when session storage is unavailable.
  }
}

export const readCheckoutDraft = (): CheckoutFormData => {
  const stored = readSessionValue(CHECKOUT_DRAFT_STORAGE_KEY)
  if (!stored) return initialCheckoutForm
  try {
    const parsed = JSON.parse(stored) as Partial<CheckoutFormData>
    return { ...initialCheckoutForm, ...parsed }
  } catch {
    return initialCheckoutForm
  }
}

// Reuses the in-flight keys when they exist and persists freshly created ones,
// so a checkout started in this tab keeps its identity across the flow.
export const bootCheckoutKeys = (): { checkoutKey: string; guestAccessToken: string } => {
  const checkoutKey = readSessionValue(CHECKOUT_KEY_STORAGE_KEY) ?? createRequestKey()
  const guestAccessToken = readSessionValue(GUEST_ACCESS_TOKEN_STORAGE_KEY) ?? createRequestKey()
  writeSessionValue(CHECKOUT_KEY_STORAGE_KEY, checkoutKey)
  writeSessionValue(GUEST_ACCESS_TOKEN_STORAGE_KEY, guestAccessToken)
  return { checkoutKey, guestAccessToken }
}

export const clearCheckoutSession = (): void => {
  clearSessionValue(CHECKOUT_DRAFT_STORAGE_KEY)
  clearSessionValue(CHECKOUT_KEY_STORAGE_KEY)
  clearSessionValue(GUEST_ACCESS_TOKEN_STORAGE_KEY)
}