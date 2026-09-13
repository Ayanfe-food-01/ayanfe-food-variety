import { UserRole } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { hashPassword, hashSessionToken, verifyPassword } from './auth.primitives.js'
import type { AdminPasswordChangeInput } from './auth.types.js'

/**
 * Changes the password for an authenticated customer who signed up with a local
 * password. Google-only customers have no passwordHash and cannot use this
 * flow. All other sessions for the customer are revoked (the current session is
 * kept) so a compromised password cannot keep lingering sessions alive.
 */
export async function changeCustomerPassword(
  userId: string,
  currentSessionToken: string | null,
  input: AdminPasswordChangeInput,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, passwordHash: true },
  })
  if (!user || user.role !== UserRole.CUSTOMER) {
    throw new HttpError(404, 'Customer account not found.')
  }
  if (!user.passwordHash) {
    throw new HttpError(400, 'This account uses Google sign-in and does not have a password.')
  }
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
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
    await transaction.customerSession.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
        ...(currentTokenHash ? { tokenHash: { not: currentTokenHash } } : {}),
      },
      data: { revokedAt: new Date() },
    })
  })
}