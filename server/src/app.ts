import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { verifyDatabaseConnection } from './lib/prisma.js'
import { errorMiddleware } from './middleware/error.middleware.js'
import { notFoundMiddleware } from './middleware/notFound.middleware.js'
import { requestLogger } from './middleware/requestLogger.js'
import { apiRoutes } from './routes/index.js'

export const app = express()
app.set('trust proxy', 1)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || env.corsOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(null, false)
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(requestLogger)

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