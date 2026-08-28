import dotenv from 'dotenv'

dotenv.config({ path: new URL('../../../.env', import.meta.url), quiet: true })

const parsePort = (value: string | undefined): number => {
  const port = Number(value ?? 8000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }
  return port
}

const nodeEnv = process.env.NODE_ENV ?? 'development'
// Prefer the explicit Neon database in this workspace. Render deployments
// provide DATABASE_URL instead, so it remains the production fallback.
const databaseUrl = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('A database connection is required to start the server')
}

const sessionSecret = process.env.SESSION_SECRET
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be configured with at least 32 characters')
}
const publicAppUrl = process.env.PUBLIC_APP_URL?.trim()
const corsOriginValue = process.env.CORS_ORIGINS?.trim()
if (!corsOriginValue) {
  throw new Error('CORS_ORIGINS is required and must contain complete frontend origins')
}

export const normalizeOrigin = (origin: string): string => {
  const trimmedOrigin = origin.trim()
  if (!trimmedOrigin) {
    throw new Error('CORS_ORIGINS contains an empty origin')
  }

  let parsedOrigin: URL
  try {
    parsedOrigin = new URL(trimmedOrigin)
  } catch {
    throw new Error(
      `CORS_ORIGINS entry "${trimmedOrigin}" must include its protocol, such as https://example.com`,
    )
  }

  if (!['http:', 'https:'].includes(parsedOrigin.protocol) || !parsedOrigin.hostname) {
    throw new Error(
      `CORS_ORIGINS entry "${trimmedOrigin}" must be an http or https origin`,
    )
  }

  if (parsedOrigin.pathname !== '/' || parsedOrigin.search || parsedOrigin.hash) {
    throw new Error(
      `CORS_ORIGINS entry "${trimmedOrigin}" must contain only protocol, host, and optional port`,
    )
  }

  return parsedOrigin.origin
}

const corsOrigins = corsOriginValue
  .split(',')
  .map(normalizeOrigin)

if (corsOrigins.length === 0) {
  throw new Error('CORS_ORIGINS must contain at least one origin')
}

const businessTimezone = process.env.BUSINESS_TIMEZONE?.trim() || 'Africa/Lagos'
try {
  new Intl.DateTimeFormat('en-NG', { timeZone: businessTimezone }).format()
} catch {
  throw new Error('BUSINESS_TIMEZONE must be a valid IANA timezone')
}

export const env = {
  databaseUrl,
  port: parsePort(process.env.PORT),
  nodeEnv,
  sessionSecret,
  businessTimezone,
  corsOrigins,
  publicAppUrl,
  googleOAuth: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY?.trim(),
    businessEmail: process.env.BUSINESS_EMAIL?.trim(),
    from: process.env.EMAIL_FROM?.trim(),
  },
} as const