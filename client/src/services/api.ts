const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.trim()
const apiBaseUrl = (
  configuredApiBaseUrl
  || (import.meta.env.DEV ? '/api/v1' : '')
).replace(/\/+$/, '')

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