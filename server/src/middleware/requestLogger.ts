import type { RequestHandler } from 'express'

export const requestLogger: RequestHandler = (request, response, next) => {
  const startedAt = Date.now()

  response.on('finish', () => {
    const duration = Date.now() - startedAt
    console.info(`${request.method} ${request.originalUrl} ${response.statusCode} ${duration}ms`)
  })

  next()
}