export const AUTH_RETURN_STORAGE_KEY = 'ayanfe-auth-return'

export const readInternalReturnPath = (locationState: unknown): string => {
  const fromState = locationState && typeof locationState === 'object' && 'from' in locationState && typeof locationState.from === 'string'
    ? locationState.from
    : null
  const storedPath = (() => {
    try {
      return window.sessionStorage.getItem(AUTH_RETURN_STORAGE_KEY)
    } catch {
      return null
    }
  })()
  const candidate = fromState ?? storedPath ?? '/'
  return candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/'
}

export const storeAuthReturnPath = (path: string): void => {
  try {
    window.sessionStorage.setItem(AUTH_RETURN_STORAGE_KEY, path)
  } catch {
    // Route state remains available when session storage is unavailable.
  }
}

export const clearAuthReturnPath = (): void => {
  try {
    window.sessionStorage.removeItem(AUTH_RETURN_STORAGE_KEY)
  } catch {
    // Navigation still works when session storage is unavailable.
  }
}

export const isCheckoutReturnPath = (path: string): boolean => {
  const pathname = path.split(/[?#]/, 1)[0]
  return pathname === '/checkout'
}