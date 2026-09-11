import { OAuth2Client } from 'google-auth-library'
import { randomBytes } from 'node:crypto'
import { env } from '../../config/env.js'
import { HttpError } from '../../utils/http.js'

export interface GoogleIdentity {
  subject: string
  email: string
  name: string
}

export const googleOAuthStateCookie = {
  name: 'ayanfe_google_oauth_state',
  maxAge: 10 * 60 * 1000,
  options: {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax' as const,
    path: '/',
  },
}

const googleIssuerValues = new Set(['accounts.google.com', 'https://accounts.google.com'])

export const isGoogleOAuthConfigured = Boolean(
  env.googleOAuth.clientId && env.googleOAuth.clientSecret && env.googleOAuth.redirectUri,
)

const requireGoogleOAuthConfiguration = (): {
  clientId: string
  clientSecret: string
  redirectUri: string
} => {
  const { clientId, clientSecret, redirectUri } = env.googleOAuth
  if (!clientId || !clientSecret || !redirectUri) {
    throw new HttpError(503, 'Google sign-in is not configured.')
  }
  return { clientId, clientSecret, redirectUri }
}

const frontendOrigin = (): string => {
  const origin = env.nodeEnv === 'production'
    ? env.publicAppUrl ?? env.corsOrigins[0]
    : env.corsOrigins[0] ?? env.publicAppUrl
  if (!origin) throw new HttpError(503, 'The authentication redirect is not configured.')
  return origin
}

export const getOAuthFrontendUrl = (status: 'success' | 'cancelled' | 'unavailable' | 'failed'): URL => {
  const url = new URL('/login', frontendOrigin())
  if (status !== 'success') {
    url.searchParams.set('oauth_error', `google_${status}`)
  } else {
    url.searchParams.set('oauth', 'google')
  }
  return url
}

export const getAdminOAuthFrontendUrl = (status: 'success' | 'cancelled' | 'unavailable' | 'failed'): URL => {
  const url = new URL('/admin/login', frontendOrigin())
  if (status !== 'success') {
    url.searchParams.set('oauth_error', `google_${status}`)
  } else {
    url.searchParams.set('oauth', 'google_admin')
  }
  return url
}

/**
 * Admin OAuth needs a redirect URI registered for the admin callback. Prefer
 * the explicit GOOGLE_ADMIN_REDIRECT_URI; otherwise derive it from the customer
 * redirect URI so a single proxy origin keeps working (e.g.
 * .../auth/customer/google/callback -> .../auth/admin/google/callback).
 */
const customerToAdminCallbackPath = '/customer/google/callback'

export const getAdminGoogleRedirectUri = (): string => {
  const explicit = env.googleOAuth.adminRedirectUri?.trim()
  if (explicit) return explicit
  const customerRedirect = env.googleOAuth.redirectUri?.trim() ?? ''
  if (customerRedirect.includes(customerToAdminCallbackPath)) {
    return customerRedirect.replace(customerToAdminCallbackPath, '/admin/google/callback')
  }
  return customerRedirect
}

export const createGoogleOAuthState = (): { state: string; nonce: string } => ({
  state: randomBytes(32).toString('base64url'),
  nonce: randomBytes(32).toString('base64url'),
})

export const getGoogleAuthorizationUrl = (state: string, nonce: string, redirectUri = getCustomerGoogleRedirectUri()): string => {
  const { clientId } = requireGoogleOAuthConfiguration()
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)
  url.searchParams.set('nonce', nonce)
  url.searchParams.set('prompt', 'select_account')
  return url.toString()
}

export const getCustomerGoogleRedirectUri = (): string => {
  const { redirectUri } = requireGoogleOAuthConfiguration()
  return redirectUri
}

export async function verifyGoogleAuthorizationCode(code: string, expectedNonce: string, redirectUri = getCustomerGoogleRedirectUri()): Promise<GoogleIdentity> {
  const { clientId, clientSecret } = requireGoogleOAuthConfiguration()
  const client = new OAuth2Client(clientId, clientSecret, redirectUri)

  let idToken: string | undefined
  try {
    const tokenResponse = await client.getToken(code)
    idToken = tokenResponse.tokens.id_token ?? undefined
  } catch {
    throw new HttpError(401, 'Google sign-in could not be completed.')
  }
  if (!idToken) throw new HttpError(401, 'Google sign-in did not return a valid identity.')

  let payload
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: clientId })
    payload = ticket.getPayload()
  } catch {
    throw new HttpError(401, 'Google sign-in returned an invalid identity.')
  }

  if (
    !payload
    || !payload.sub
    || !payload.email
    || !payload.email_verified
    || !payload.iss
    || !googleIssuerValues.has(payload.iss)
    || (Array.isArray(payload.aud) ? !payload.aud.includes(clientId) : payload.aud !== clientId)
    || payload.nonce !== expectedNonce
    || !payload.exp
    || payload.exp <= Math.floor(Date.now() / 1000)
  ) {
    throw new HttpError(401, 'Google sign-in returned an invalid identity.')
  }

  return {
    subject: payload.sub,
    email: payload.email.trim().toLowerCase(),
    name: (payload.name?.trim() || payload.email.split('@')[0] || payload.email).slice(0, 180),
  }
}