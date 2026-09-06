import { randomBytes } from 'node:crypto'
import { UserRole } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { sendPasswordResetEmail } from './auth.email.js'
import {
  authCookie,
  customerAuthCookie,
  getEmailDomain,
  getSessionToken,
  getCustomerSessionToken,
  hashPassword,
  hashSessionToken,
  readAuthCookie,
  toUser,
  verifyPassword,
} from './auth.primitives.js'
import type {
  AdminPasswordChangeInput,
  AuthenticatedUser,
  LoginInput,
  PasswordResetInput,
  PasswordResetRequestInput,
} from './auth.types.js'

export { authCookie, customerAuthCookie, getEmailDomain, getCustomerSessionToken, getSessionToken, hashPassword, hashSessionToken, readAuthCookie, toUser, verifyPassword } from './auth.primitives.js'

const PASSWORD_RESET_TTL_MS = 20 * 60 * 1000

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
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
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

const genericPasswordResetMessage =
  "If an account exists with this email, we've sent password reset instructions."

export async function requestPasswordReset(input: PasswordResetRequestInput): Promise<{
  message: string
}> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, passwordHash: true },
  })

  if (!user?.passwordHash) return { message: genericPasswordResetMessage }

  const rawToken = randomBytes(32).toString('base64url')
  const now = new Date()
  const resetToken = await prisma.$transaction(async (transaction) => {
    await transaction.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    })
    return transaction.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashPasswordResetToken(rawToken),
        expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
      },
    })
  })

  try {
    await sendPasswordResetEmail({
      recipient: user.email,
      token: rawToken,
      expiresInMinutes: PASSWORD_RESET_TTL_MS / 60_000,
    })
  } catch (error: unknown) {
    await prisma.passwordResetToken.deleteMany({
      where: { id: resetToken.id, usedAt: null },
    }).catch((cleanupError: unknown) => {
      console.error(JSON.stringify({
        event: 'password_reset_email_cleanup_failed',
        recipientDomain: getEmailDomain(user.email),
        errorName: cleanupError instanceof Error ? cleanupError.name : 'UnknownError',
      }))
    })
    console.error(JSON.stringify({
      event: 'password_reset_email_delivery_failed',
      recipientDomain: getEmailDomain(user.email),
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }))
  }

  return { message: genericPasswordResetMessage }
}

export async function resetPassword(input: PasswordResetInput): Promise<void> {
  const tokenHash = hashPasswordResetToken(input.token)
  const now = new Date()
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  })

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now) {
    throw new HttpError(400, 'This password reset link is invalid or has expired.')
  }

  const passwordHash = await hashPassword(input.newPassword)
  await prisma.$transaction(async (transaction) => {
    const claimed = await transaction.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    })
    if (claimed.count !== 1) {
      throw new HttpError(400, 'This password reset link is invalid or has expired.')
    }

    await transaction.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    })
    await transaction.adminSession.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: now },
    })
    await transaction.customerSession.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: now },
    })
    await transaction.passwordResetToken.updateMany({
      where: { userId: resetToken.userId, usedAt: null },
      data: { usedAt: now },
    })
  })
}

export async function changeAdminPassword(
  userId: string,
  currentSessionToken: string | null,
  input: AdminPasswordChangeInput,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, passwordHash: true },
  })
  if (!user || user.role !== UserRole.ADMIN || !user.passwordHash || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new HttpError(400, 'Current password is incorrect.')
  }
  if (await verifyPassword(input.newPassword, user.passwordHash)) {
    throw new HttpError(400, 'New password must be different from your current password.')
  }

  const passwordHash = await hashPassword(input.newPassword)
  const currentTokenHash = currentSessionToken ? hashSessionToken(currentSessionToken) : null
  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })
    await transaction.adminSession.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
        ...(currentTokenHash ? { tokenHash: { not: currentTokenHash } } : {}),
      },
      data: { revokedAt: new Date() },
    })
  })
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

export async function createInitialAdmin(input: {
  name: string
  email: string
  password: string
  forceReset: boolean
}): Promise<'created' | 'updated' | 'exists'> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (!existing) {
    await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: UserRole.ADMIN,
      },
    })
    return 'created'
  }
  if (!input.forceReset) return 'exists'
  await prisma.user.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      passwordHash: await hashPassword(input.password),
      role: UserRole.ADMIN,
    },
  })
  await prisma.adminSession.updateMany({
    where: { userId: existing.id, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  return 'updated'
}

const hashPasswordResetToken = (token: string) =>
  hashSessionToken(`password-reset:${token}`)