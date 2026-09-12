import { UserRole } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { verifyGoogleAuthorizationCode } from './auth.google.js'
import type { GoogleIdentity } from './auth.google.js'
import { createSession, toUser } from './auth.service.js'
import type { AuthenticatedUser } from './auth.types.js'
import { findOrCreateGoogleCustomer } from './customer-auth.login.service.js'

/**
 * Single Google sign-in for BOTH customer and admin accounts.
 *
 * One registered redirect URI + one callback endpoint. The callback decides the
 * session type only AFTER the Google identity is verified, based on whether the
 * identity already belongs to an administrator in the database:
 *
 *  - ADMIN identity   -> issues the strict admin session (never auto-creates an
 *                        admin; it only ever binds to an existing role=ADMIN row)
 *  - otherwise        -> the normal customer flow (existing account or a newly
 *                        created customer)
 *
 * Email/password sign-in already shares one form for both roles; this makes the
 * Google path equally unified.
 */

export async function resolveGoogleLogin(
  code: string,
  nonce: string,
): Promise<{
  sessionType: 'admin' | 'customer'
  user: AuthenticatedUser
  token: string
}> {
  const identity = await verifyGoogleAuthorizationCode(code, nonce)
  const admin = await findAdministratorForGoogleIdentity(identity)
  if (admin) {
    const session = await createSession(admin, 'admin')
    return { sessionType: 'admin', user: toUser(admin), token: session.token }
  }
  const customer = await findOrCreateGoogleCustomer(identity)
  const session = await createSession(customer.user, 'customer')
  return { sessionType: 'customer', user: toUser(customer.user), token: session.token }
}

/**
 * Returns the existing ADMIN matched by this Google identity, or null.
 *
 * Matches by linked Google subject first, then by verified email against
 * admin records. The first successful match links the subject so subsequent
 * sign-ins remain stable. It NEVER creates an administrator: an unknown
 * identity (or one matching only a customer) simply falls through to the
 * customer flow.
 */
export async function findAdministratorForGoogleIdentity(identity: GoogleIdentity): Promise<{
  id: string
  name: string
  email: string
  role: UserRole
} | null> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const bySubject = await transaction.user.findUnique({
        where: { googleSubject: identity.subject },
        select: { id: true, name: true, email: true, role: true },
      })
      if (bySubject) {
        if (bySubject.role !== UserRole.ADMIN) return null
        return bySubject
      }

      const byEmail = await transaction.user.findFirst({
        where: {
          email: { equals: identity.email, mode: 'insensitive' },
          role: UserRole.ADMIN,
        },
        select: { id: true, name: true, email: true, role: true, googleSubject: true },
      })
      if (!byEmail) return null
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