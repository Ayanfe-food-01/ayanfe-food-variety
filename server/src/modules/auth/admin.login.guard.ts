import type { RequestHandler } from 'express'
import { UserRole } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'

/**
 * Failed-attempt limiting for the ADMIN login path.
 *
 * This deliberately keys on the admin account (email) rather than only the IP,
 * so a distributed or shared-IP attack cannot brute-force an administrator's
 * password. It runs before password verification so a locked account never
 * costs a scrypt comparison. Customer login behavior is unaffected: accounts
 * that are not role=ADMIN bypass the account key and rely on the shared
 * per-IP route limiter.
 *
 * The store is intentionally in-memory (like the shared rate limiter). On
 * Render's single-instance deployment this is exact; with multiple replicas it
 * degrades to per-instance limiting (documented as a remaining risk).
 */

interface FailedLoginState {
  failures: number
  lockedUntil: number
}

const MAX_FAILED_ATTEMPTS = 5
const LOCK_WINDOW_MS = 15 * 60 * 1000

const failuresByEmail = new Map<string, FailedLoginState>()

const normalizeEmail = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

const clearFailures = (email: string): void => {
  failuresByEmail.delete(email)
}

const recordFailure = (email: string): boolean => {
  const now = Date.now()
  const current = failuresByEmail.get(email)
  if (!current || current.lockedUntil <= now) {
    failuresByEmail.set(email, { failures: 1, lockedUntil: now + LOCK_WINDOW_MS })
    return false
  }
  current.failures += 1
  if (current.failures >= MAX_FAILED_ATTEMPTS) {
    current.lockedUntil = now + LOCK_WINDOW_MS
    return true
  }
  return false
}

export const adminLoginAttemptGuard: RequestHandler = async (request, response, next) => {
  const email = normalizeEmail((request.body as { email?: unknown } | undefined)?.email)
  if (!email) {
    next()
    return
  }

  let isAdminUser = false
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { role: true },
    })
    isAdminUser = user?.role === UserRole.ADMIN
  } catch {
    // If the lookup fails, fall through to the normal login error path instead
    // of surprising the client with a different failure mode.
    next()
    return
  }

  if (!isAdminUser) {
    next()
    return
  }

  const now = Date.now()
  const state = failuresByEmail.get(email)
  if (state && state.lockedUntil > now) {
    response.setHeader('Retry-After', Math.ceil((state.lockedUntil - now) / 1000))
    next(new HttpError(429, 'Too many failed sign-in attempts. Please try again later.'))
    return
  }

  response.once('finish', () => {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      clearFailures(email)
      return
    }
    if (response.statusCode === 401 || response.statusCode === 403) {
      const locked = recordFailure(email)
      if (locked) {
        console.info(JSON.stringify({
          event: 'admin_login_attempts_exhausted',
          email,
        }))
      }
    }
  })

  next()
}