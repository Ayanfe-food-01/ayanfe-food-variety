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
const maxNetworkAttempts = 3

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))

const networkErrorMessage = () => import.meta.env.DEV
  ? `Unable to reach the local API at ${apiBaseUrl}. The Start API workflow may still be starting; try again in a moment.`
  : `Unable to reach the production API at ${apiBaseUrl}. Verify the Vercel VITE_API_URL and Render CORS_ORIGINS settings.`

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

  let response: Response | null = null

  for (let attempt = 1; attempt <= maxNetworkAttempts; attempt += 1) {
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
      if (attempt === maxNetworkAttempts) throw new ApiError(networkErrorMessage(), 0)
      await wait(attempt * 400)
    }
  }
  if (!response) throw new ApiError(networkErrorMessage(), 0)

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