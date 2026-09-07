import { randomBytes } from 'node:crypto'
import { UserRole } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { AuthenticatedUser, LoginInput } from './auth.types.js'
import { hashSessionToken, toUser, verifyPassword } from './auth.primitives.js'

const SESSION_TTL_MS = 8 * 60 * 60 * 1000

type SessionKind = 'admin' | 'customer'

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
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
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

export async function getAuthenticatedUser(token: string | null): Promise<AuthenticatedUser | null> {
  if (!token) return null
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  })
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null
  return toUser(session.user)
}

export async function revokeSession(token: string | null): Promise<void> {
  if (!token) return
  await prisma.adminSession.updateMany({
    where: { tokenHash: hashSessionToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}