import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { verifyDatabaseConnection } from './lib/prisma.js'
import { errorMiddleware } from './middleware/error.middleware.js'
import { notFoundMiddleware } from './middleware/notFound.middleware.js'
import { requestLogger } from './middleware/requestLogger.js'
import { apiRoutes } from './routes/index.js'
import { paymentWebhookRouter } from './modules/payments/payment.webhook.js'
import { HttpError } from './utils/http.js'
import { normalizeOrigin } from './config/env.js'

const getAllowedOrigin = (origin: string | undefined): string | undefined => {
  if (!origin) return undefined
  try {
    const normalizedOrigin = normalizeOrigin(origin)
    return env.corsOrigins.includes(normalizedOrigin) ? normalizedOrigin : undefined
  } catch {
    return undefined
  }
}

export const app = express()
app.set('trust proxy', 1)

app.use(requestLogger)
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigin = getAllowedOrigin(origin)
    if (allowedOrigin) {
      callback(null, allowedOrigin)
      return
    }

    if (!origin) {
      callback(null, true)
      return
    }

    console.warn(JSON.stringify({
      event: 'cors_blocked',
      origin: origin ?? null,
      allowedOrigins: env.corsOrigins,
      accepted: false,
    }))
    callback(new HttpError(403, 'The request origin is not allowed.'))
  },
  credentials: true,
}))

// Webhook endpoint mounted before express.json() so the raw body buffer is
// available for Paystack HMAC-SHA512 signature verification. Only the
// /webhook path applies express.raw(); all other routes fall through.
app.use('/api/v1/payments/paystack', paymentWebhookRouter)
app.use(express.json({ limit: '1mb' }))

app.get('/', (_request, response) => {
  response.json({
    service: 'ayanfe-food-variety-api',
    status: 'ok',
    health: '/health',
    api: '/api/v1',
  })
})

app.get('/health', (_request, response) => {
  response.json({ data: { status: 'ok' } })
})

app.get('/ready', async (_request, response) => {
  try {
    await verifyDatabaseConnection()
    response.json({
      data: {
        status: 'ready',
        database: 'ok',
        imageStorage: env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret
          ? 'configured'
          : 'not_configured',
      },
    })
  } catch (error: unknown) {
    console.error('Readiness check failed', error)
    response.status(503).json({
      error: {
        message: 'The API is running but cannot reach its database.',
        statusCode: 503,
      },
    })
  }
})

app.use('/api/v1', apiRoutes)

app.use(notFoundMiddleware)
app.use(errorMiddleware)