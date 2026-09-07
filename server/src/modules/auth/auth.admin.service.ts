import { UserRole } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { AdminPasswordChangeInput } from './auth.types.js'
import { hashPassword, hashSessionToken, verifyPassword } from './auth.primitives.js'

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