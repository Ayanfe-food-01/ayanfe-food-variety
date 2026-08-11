import 'dotenv/config'

const parsePort = (value: string | undefined): number => {
  const port = Number(value ?? 8000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }
  return port
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to start the server')
}

const nodeEnv = process.env.NODE_ENV ?? 'development'
const sessionSecret = process.env.SESSION_SECRET
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be configured with at least 32 characters')
}
const corsOriginValue = process.env.CORS_ORIGIN ?? process.env.CLIENT_URL
if (nodeEnv === 'production' && !corsOriginValue) {
  throw new Error('CORS_ORIGIN is required in production')
}

const corsOrigins = (corsOriginValue ?? 'http://localhost:5000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

if (corsOrigins.length === 0) {
  throw new Error('CORS_ORIGIN must contain at least one origin')
}

export const env = {
  databaseUrl,
  port: parsePort(process.env.PORT),
  nodeEnv,
  sessionSecret,
  corsOrigins,
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
    resendApiKey: process.env.RESEND_API_KEY,
    businessEmail: process.env.BUSINESS_EMAIL,
    from: process.env.EMAIL_FROM,
  },
} as const