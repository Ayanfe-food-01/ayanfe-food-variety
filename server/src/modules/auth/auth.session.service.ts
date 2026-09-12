import { randomBytes } from 'node:crypto'
import { UserRole } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { ADMIN_AUDIT_EVENTS, recordAdminAudit } from '../audit/audit.service.js'
import type { AuthenticatedUser, LoginInput } from './auth.types.js'
import { hashSessionToken, toUser, verifyPassword } from './auth.primitives.js'
import {
  ADMIN_ACTIVITY_TOUCH_INTERVAL_MS,
  ADMIN_INACTIVITY_TTL_MS,
  ADMIN_SESSION_TTL_MS,
  CUSTOMER_SESSION_TTL_MS,
} from './auth.session.constants.js'

type SessionKind = 'admin' | 'customer'

const sessionTtlMs = (kind: SessionKind): number =>
  kind === 'admin' ? ADMIN_SESSION_TTL_MS : CUSTOMER_SESSION_TTL_MS

export async function createSession(user: {
  id: string
  name: string
  email: string
  role: UserRole
}, kind: SessionKind): Promise<{ user: AuthenticatedUser; token: string }> {
  const token = randomBytes(32).toString('base64url')
  const sessionData = {
    userId: user.id,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + sessionTtlMs(kind)),
  }

  await prisma.$transaction(async (transaction) => {
    if (kind === 'admin') {
      await transaction.adminSession.create({ data: sessionData })
    } else {
      await transaction.customerSession.create({ data: sessionData })
    }

    await transaction.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })
  })

  return { user: toUser(user), token }
}

export async function login(input: LoginInput): Promise<{
  user: AuthenticatedUser
  token: string
  sessionType: 'admin' | 'customer'
}> {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  if (!user || !user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password.')
  }

  if (user.role === UserRole.CUSTOMER) {
    if (!user.emailVerified) {
      throw new HttpError(403, 'Please verify your email before signing in.')
    }
    const customerSession = await createSession(user, 'customer')
    return { ...customerSession, sessionType: 'customer' }
  }

  const adminSession = await createSession(user, 'admin')
  return { ...adminSession, sessionType: 'admin' }
}

/**
 * Persists the session's last-activity timestamp, throttled to at most once
 * per ADMIN_ACTIVITY_TOUCH_INTERVAL_MS. Fire-and-forget: the enforcement
 * decisions above have already been made from the freshly read row, and an
 * occasionally skipped write only shortens (never extends) the idle budget.
 */
const bumpAdminSessionActivity = (sessionId: string, lastActivityAt: Date): void => {
  const now = new Date()
  if (now.getTime() - lastActivityAt.getTime() < ADMIN_ACTIVITY_TOUCH_INTERVAL_MS) return
  void prisma.adminSession.updateMany({
    where: { id: sessionId, lastActivityAt: { lt: now } },
    data: { lastActivityAt: now },
  }).catch(() => {
    // Best effort only. The idle policy is enforced from the current row.
  })
}

export async function getAuthenticatedUser(token: string | null): Promise<AuthenticatedUser | null> {
  if (!token) return null
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  })
  if (!session || session.revokedAt) return null

  const now = new Date()
  if (session.expiresAt <= now || session.lastActivityAt <= new Date(now.getTime() - ADMIN_INACTIVITY_TTL_MS)) {
    void recordAdminAudit({
      adminUserId: session.userId,
      adminEmail: session.user.email,
      event: ADMIN_AUDIT_EVENTS.SESSION_EXPIRED,
    })
    return null
  }

  bumpAdminSessionActivity(session.id, session.lastActivityAt)
  return toUser(session.user)
}

export async function revokeSession(token: string | null): Promise<void> {
  if (!token) return
  await prisma.adminSession.updateMany({
    where: { tokenHash: hashSessionToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}