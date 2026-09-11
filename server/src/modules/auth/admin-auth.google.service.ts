import { UserRole } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import {
  getAdminGoogleRedirectUri,
  verifyGoogleAuthorizationCode,
} from './auth.google.js'
import type { GoogleIdentity } from './auth.google.js'
import { createSession, toUser } from './auth.service.js'
import type { AuthenticatedUser } from './auth.types.js'

const ADMIN_GOOGLE_FORBIDDEN_MESSAGE =
  'This Google account is not authorized for administrator access.'

/**
 * Admin Google OAuth is STRICTER than customer Google OAuth:
 *   - it only ever binds to an account that ALREADY holds role=ADMIN
 *     (explicit administrator authorization), and
 *   - it never creates a new admin account from a Google identity.
 *
 * Matching is by the linked Google subject first, then by the verified Google
 * email against existing admin records. The first successful match links the
 * subject so subsequent sign-ins remain stable.
 */
async function findAuthorizedAdmin(identity: GoogleIdentity): Promise<{
  id: string
  name: string
  email: string
  role: UserRole
}> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const bySubject = await transaction.user.findUnique({
        where: { googleSubject: identity.subject },
        select: { id: true, name: true, email: true, role: true },
      })
      if (bySubject) {
        if (bySubject.role !== UserRole.ADMIN) {
          throw new HttpError(403, ADMIN_GOOGLE_FORBIDDEN_MESSAGE)
        }
        return bySubject
      }

      const byEmail = await transaction.user.findFirst({
        where: {
          email: { equals: identity.email, mode: 'insensitive' },
          role: UserRole.ADMIN,
        },
        select: { id: true, name: true, email: true, role: true, googleSubject: true },
      })
      if (!byEmail) {
        throw new HttpError(403, ADMIN_GOOGLE_FORBIDDEN_MESSAGE)
      }
      if (byEmail.googleSubject && byEmail.googleSubject !== identity.subject) {
        throw new HttpError(409, 'This administrator email is already linked to another Google account.')
      }

      return transaction.user.update({
        where: { id: byEmail.id },
        data: {
          authProvider: 'GOOGLE',
          googleSubject: identity.subject,
          name: byEmail.name || identity.name,
        },
        select: { id: true, name: true, email: true, role: true },
      })
    })
  } catch (error: unknown) {
    if (error instanceof HttpError) throw error
    console.error(JSON.stringify({
      event: 'admin_google_binding_failed',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }))
    throw new HttpError(409, 'This Google account could not be linked safely.')
  }
}

export async function loginAdminWithGoogle(
  code: string,
  nonce: string,
): Promise<{ user: AuthenticatedUser; token: string }> {
  const identity = await verifyGoogleAuthorizationCode(code, nonce, getAdminGoogleRedirectUri())
  return loginAdminWithGoogleIdentity(identity)
}

export async function loginAdminWithGoogleIdentity(identity: GoogleIdentity): Promise<{
  user: AuthenticatedUser
  token: string
}> {
  const admin = await findAuthorizedAdmin(identity)
  const session = await createSession(admin, 'admin')
  return { user: toUser(admin), token: session.token }
}