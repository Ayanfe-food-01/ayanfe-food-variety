const normalizeApiBaseUrl = (value: string | undefined): string => {
  const cleanedValue = value?.trim().replace(/[.,;!?]+$/, '').replace(/\/+$/, '') ?? ''
  if (!cleanedValue) return ''

  if (cleanedValue === '/api/v1' || cleanedValue.endsWith('/api/v1')) {
    return cleanedValue
  }

  try {
    const url = new URL(cleanedValue)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return ''
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/api/v1`
    return url.toString().replace(/\/+$/, '')
  } catch {
    return ''
  }
}

const configuredApiBaseUrl = import.meta.env.VITE_API_URL
const apiBaseUrl = normalizeApiBaseUrl(
  configuredApiBaseUrl || (import.meta.env.DEV ? '/api/v1' : undefined),
)

// Bounded wait window granted for the API to come up (e.g. a freshly started
// backend) before a request gives up. Requests poll for readiness instead of
// failing immediately, which avoids transient startup-timing errors.
const maxStartupWaitMs = import.meta.env.DEV ? 10_000 : 6_000
const retryBaseDelayMs = 500

const wait = (milliseconds: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) {
    reject(new DOMException('The request was aborted.', 'AbortError'))
    return
  }
  const timeout = window.setTimeout(resolve, milliseconds)
  signal?.addEventListener('abort', () => {
    window.clearTimeout(timeout)
    reject(new DOMException('The request was aborted.', 'AbortError'))
  }, { once: true })
})

// User-facing message for network failures. Deliberately avoids internal
// details (API paths, backend/workflow names, vendor origins).
const networkErrorMessage = 'Something went wrong. Please try again in a moment.'

// Polls the API base until it responds or the bounded startup window elapses.
// A response of any status counts as "reachable" (the server is up); only a
// network-layer failure (e.g. backend not started) keeps us polling.
const waitForApiReachable = async (signal?: AbortSignal): Promise<void> => {
  const deadline = Date.now() + maxStartupWaitMs
  while (Date.now() < deadline) {
    const remaining = Math.max(deadline - Date.now(), 0)
    try {
      await fetch(apiBaseUrl, {
        method: 'GET',
        credentials: 'include',
        signal,
        headers: { Accept: 'application/json' },
      })
      return
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error
      await wait(Math.min(retryBaseDelayMs, remaining), signal)
    }
  }
}

export const getApiUrl = (path: string): string => `${apiBaseUrl}${path}`

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (!apiBaseUrl) {
    throw new ApiError('The API URL is not configured for this environment.', 0)
  }

  let response: Response

  const method = (options?.method ?? 'GET').toUpperCase()
  const isRetryableRequest = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
    || Object.entries(options?.headers ?? {}).some(([key, value]) => key.toLowerCase() === 'x-checkout-request' && value === '1')

  const deadline = Date.now() + (isRetryableRequest ? maxStartupWaitMs : 0)

  while (true) {
    try {
      response = await fetch(`${apiBaseUrl}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...options?.headers,
        },
      })
      break
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') throw error
      if (!isRetryableRequest) {
        // Writes are never resent (avoiding duplicate side effects). Instead we
        // wait for the API to become reachable, then surface the friendly error.
        await waitForApiReachable(options?.signal ?? undefined)
        throw new ApiError(networkErrorMessage, 0)
      }
      if (Date.now() >= deadline) throw new ApiError(networkErrorMessage, 0)
      await wait(retryBaseDelayMs, options?.signal ?? undefined)
    }
  }
  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    const serverMessage =
      body && typeof body === 'object' && 'error' in body
        ? (body.error as { message?: unknown }).message
        : undefined

    throw new ApiError(
      typeof serverMessage === 'string' ? serverMessage : 'The request could not be completed.',
      response.status,
    )
  }

  return body as T
}