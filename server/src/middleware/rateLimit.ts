import type { RequestHandler } from 'express'
import { HttpError } from '../utils/http.js'

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export const createRateLimit = (maxRequests: number, windowMs: number): RequestHandler =>
  (request, response, next) => {
    const now = Date.now()
    const key = `${request.ip}:${request.path}`
    const current = buckets.get(key)

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    if (current.count >= maxRequests) {
      response.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000))
      next(new HttpError(429, 'Too many requests. Please try again later.'))
      return
    }

    current.count += 1
    next()
  }