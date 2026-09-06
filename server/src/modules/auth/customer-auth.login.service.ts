import { ShoppingMode, UserRole } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { createSession, hashSessionToken, toUser, verifyPassword } from './auth.service.js'
import { verifyGoogleAuthorizationCode } from './auth.google.js'
import type { GoogleIdentity } from './auth.google.js'
import type { AuthenticatedUser, LoginInput } from './auth.types.js'

export async function loginCustomer(input: LoginInput): Promise<{ user: AuthenticatedUser; token: string }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  if (!user || user.role !== UserRole.CUSTOMER || !user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password.')
  }
  if (!user.emailVerified) {
    throw new HttpError(403, 'Please verify your email before signing in.')
  }
  return createSession(user, 'customer')
}

export async function getAuthenticatedCustomer(token: string | null): Promise<AuthenticatedUser | null> {
  if (!token) return null
  const session = await prisma.customerSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  })
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.role !== UserRole.CUSTOMER) return null
  return toUser(session.user)
}

export async function revokeCustomerSession(token: string | null): Promise<void> {
  if (!token) return
  await prisma.customerSession.updateMany({
    where: { tokenHash: hashSessionToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function setCustomerShoppingMode(userId: string, mode: ShoppingMode): Promise<AuthenticatedUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { shoppingMode: mode },
  })
  return toUser(user)
}

type GoogleCustomerResult = {
  user: {
    id: string
    name: string
    email: string
    role: UserRole
    phone: string | null
    emailVerified: boolean
  }
}

async function findOrCreateGoogleCustomer(identity: GoogleIdentity): Promise<GoogleCustomerResult> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const userBySubject = await transaction.user.findUnique({
        where: { googleSubject: identity.subject },
      })
      if (userBySubject) {
        if (userBySubject.role !== UserRole.CUSTOMER || userBySubject.email !== identity.email) {
          throw new HttpError(409, 'This Google account cannot be used for this customer account.')
        }
        if (!userBySubject.emailVerified) {
          await transaction.customerEmailVerification.deleteMany({
            where: { userId: userBySubject.id },
          })
          return {
            user: await transaction.user.update({
              where: { id: userBySubject.id },
              data: { emailVerified: true },
            }),
          }
        }
        return { user: userBySubject }
      }

      const userByEmail = await transaction.user.findUnique({
        where: { email: identity.email },
      })
      if (userByEmail) {
        if (userByEmail.role !== UserRole.CUSTOMER) {
          throw new HttpError(403, 'Google sign-in is available for customer accounts only.')
        }
        if (userByEmail.googleSubject && userByEmail.googleSubject !== identity.subject) {
          throw new HttpError(409, 'This email is already linked to another Google account.')
        }
        await transaction.customerEmailVerification.deleteMany({
          where: { userId: userByEmail.id },
        })
        const linkedUser = await transaction.user.update({
          where: { id: userByEmail.id },
          data: {
            authProvider: 'GOOGLE',
            googleSubject: identity.subject,
            emailVerified: true,
            name: userByEmail.name || identity.name,
          },
        })
        return { user: linkedUser }
      }

      const createdUser = await transaction.user.create({
        data: {
          name: identity.name,
          email: identity.email,
          passwordHash: null,
          role: UserRole.CUSTOMER,
          authProvider: 'GOOGLE',
          googleSubject: identity.subject,
          emailVerified: true,
        },
      })
      return { user: createdUser }
    })
  } catch (error: unknown) {
    if (error instanceof HttpError) throw error
    console.error(JSON.stringify({
      event: 'google_customer_account_upsert_failed',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }))
    throw new HttpError(409, 'This Google account could not be linked safely.')
  }
}

export async function loginWithGoogle(
  code: string,
  nonce: string,
): Promise<{ user: AuthenticatedUser; token: string }> {
  const identity = await verifyGoogleAuthorizationCode(code, nonce)
  return loginWithGoogleIdentity(identity)
}

export async function loginWithGoogleIdentity(identity: GoogleIdentity): Promise<{ user: AuthenticatedUser; token: string }> {
  const result = await findOrCreateGoogleCustomer(identity)
  return {
    user: toUser(result.user),
    token: (await createSession(result.user, 'customer')).token,
  }
}