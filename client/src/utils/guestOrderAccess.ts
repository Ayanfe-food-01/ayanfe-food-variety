const GUEST_ORDER_ACCESS_PREFIX = 'ayanfe-guest-order-access:'

const storageKey = (orderNumber: string) => `${GUEST_ORDER_ACCESS_PREFIX}${orderNumber}`

export const saveGuestOrderAccessToken = (orderNumber: string, token: string): void => {
  try {
    window.localStorage.setItem(storageKey(orderNumber), token)
  } catch {
    // The order link remains usable for the current navigation if storage is unavailable.
  }
}

export const getGuestOrderAccessToken = (orderNumber: string): string | null => {
  try {
    return window.localStorage.getItem(storageKey(orderNumber))
  } catch {
    return null
  }
}

export const clearGuestOrderAccessToken = (orderNumber: string): void => {
  try {
    window.localStorage.removeItem(storageKey(orderNumber))
  } catch {
    // Nothing else is required when storage is unavailable.
  }
}