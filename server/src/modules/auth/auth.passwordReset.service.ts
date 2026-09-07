import { randomBytes } from 'node:crypto'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { sendPasswordResetEmail } from './auth.email.js'
import type { PasswordResetInput, PasswordResetRequestInput } from './auth.types.js'
import { getEmailDomain, hashPassword, hashSessionToken } from './auth.primitives.js'

const PASSWORD_RESET_TTL_MS = 20 * 60 * 1000

const genericPasswordResetMessage =
  "If an account exists with this email, we've sent password reset instructions."

const hashPasswordResetToken = (token: string): string =>
  hashSessionToken(`password-reset:${token}`)

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