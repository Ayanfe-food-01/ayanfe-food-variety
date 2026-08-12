const normalizeApiBaseUrl = (value: string | undefined): string => {
  const cleanedValue = value?.trim().replace(/[.,;!?]+$/, '').replace(/\/+$/, '') ?? ''
  if (!cleanedValue) return ''

  if (cleanedValue === '/api/v1' || cleanedValue.endsWith('/api/v1')) {
    return cleanedValue
  }

  try {
    const url = new URL(cleanedValue)
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/api/v1`
    return url.toString().replace(/\/+$/, '')
  } catch {
    return cleanedValue
  }
}

const configuredApiBaseUrl = import.meta.env.VITE_API_URL
const apiBaseUrl = normalizeApiBaseUrl(
  configuredApiBaseUrl || (import.meta.env.DEV ? '/api/v1' : undefined),
)

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

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...options?.headers,
      },
    })
  } catch {
    throw new ApiError(
      'The API server cannot be reached. Start the API service or check the configured API URL.',
      0,
    )
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