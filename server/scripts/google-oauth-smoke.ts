import { AuthProvider, UserRole } from '@prisma/client'
import { prisma, closeDatabase } from '../src/lib/prisma.js'
import { loginWithGoogleIdentity } from '../src/modules/auth/auth.service.js'
import type { GoogleIdentity } from '../src/modules/auth/auth.google.js'
import { HttpError } from '../src/utils/http.js'

const slug = `google-smoke-${Date.now().toString(36)}`

const expectHttpError = async (operation: Promise<unknown>, expectedStatus: number): Promise<void> => {
  try {
    await operation
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === expectedStatus) return
    throw error
  }
  throw new Error(`Expected HTTP ${expectedStatus} error.`)
}

async function main() {
  const userIds: string[] = []

  const deleteUsers = async () => {
    if (userIds.length === 0) return
    await prisma.customerEmailVerification.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  }

  try {
    const identityNew: GoogleIdentity = {
      subject: `sub-${slug}-new`,
      email: `${slug}-new@example.com`,
      name: 'New Google User',
    }
    const signup = await loginWithGoogleIdentity(identityNew)
    userIds.push(signup.user.id)
    const newUser = await prisma.user.findUniqueOrThrow({ where: { id: signup.user.id } })
    if (!newUser.emailVerified) throw new Error('New Google user was not created verified.')
    if (newUser.authProvider !== AuthProvider.GOOGLE) throw new Error('New Google user auth provider mismatch.')
    if (newUser.googleSubject !== identityNew.subject) throw new Error('New Google user subject not stored.')
    if (newUser.passwordHash !== null) throw new Error('New Google user unexpectedly has a password.')
    if (!signup.token) throw new Error('New Google user got no session token.')
    const signupPendingOtp = await prisma.customerEmailVerification.count({
      where: { userId: signup.user.id },
    })
    if (signupPendingOtp !== 0) throw new Error('New Google user must not have a pending verification.')
    const signupSession = await prisma.customerSession.count({ where: { userId: signup.user.id } })
    if (signupSession !== 1) throw new Error('New Google user should have exactly one customer session.')

    const identityExisting: GoogleIdentity = {
      subject: `sub-${slug}-link`,
      email: `${slug}-link@example.com`,
      name: 'Linked Google User',
    }
    const pendingUser = await prisma.user.create({
      data: {
        name: 'Existing Email User',
        email: identityExisting.email,
        role: UserRole.CUSTOMER,
        authProvider: AuthProvider.PASSWORD,
        emailVerified: false,
      },
    })
    userIds.push(pendingUser.id)
    await prisma.customerEmailVerification.create({
      data: {
        userId: pendingUser.id,
        otpHash: 'e'.repeat(64),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        requestWindowStart: new Date(),
      },
    })
    const linked = await loginWithGoogleIdentity(identityExisting)
    if (linked.user.id !== pendingUser.id) throw new Error('Google linking returned a different user.')
    const linkedUser = await prisma.user.findUniqueOrThrow({ where: { id: pendingUser.id } })
    if (!linkedUser.emailVerified) throw new Error('Linked email+password user was not verified via Google.')
    if (linkedUser.googleSubject !== identityExisting.subject) throw new Error('Email+password user was not linked to Google.')
    if (linkedUser.authProvider !== AuthProvider.GOOGLE) throw new Error('Linked user auth provider mismatch.')
    const linkedPendingOtp = await prisma.customerEmailVerification.count({
      where: { userId: pendingUser.id },
    })
    if (linkedPendingOtp !== 0) throw new Error('Linked user still has a pending verification.')

    const again = await loginWithGoogleIdentity(identityNew)
    if (again.user.id !== signup.user.id) throw new Error('Repeating Google sign-in created a duplicate user.')
    const againUser = await prisma.user.findUniqueOrThrow({ where: { id: again.user.id } })
    if (!againUser.emailVerified) throw new Error('Repeated Google sign-in dropped verification.')

    const identityLegacy: GoogleIdentity = {
      subject: `sub-${slug}-legacy`,
      email: `${slug}-legacy@example.com`,
      name: 'Legacy Google User',
    }
    const legacyUser = await prisma.user.create({
      data: {
        name: 'Legacy Google User',
        email: identityLegacy.email,
        role: UserRole.CUSTOMER,
        authProvider: AuthProvider.GOOGLE,
        googleSubject: identityLegacy.subject,
        emailVerified: false,
      },
    })
    userIds.push(legacyUser.id)
    const legacy = await loginWithGoogleIdentity(identityLegacy)
    if (legacy.user.id !== legacyUser.id) throw new Error('Legacy Google re-sign-in returned a different user.')
    const legacyResult = await prisma.user.findUniqueOrThrow({ where: { id: legacyUser.id } })
    if (!legacyResult.emailVerified) throw new Error('Legacy unverified Google user was not verified.')

    const adminUser = await prisma.user.create({
      data: {
        name: 'Smoke Admin',
        email: `${slug}-admin@example.com`,
        role: UserRole.ADMIN,
      },
    })
    userIds.push(adminUser.id)
    await expectHttpError(
      loginWithGoogleIdentity({ subject: `sub-${slug}-admin`, email: adminUser.email, name: 'Admin' }),
      403,
    )

    await expectHttpError(
      loginWithGoogleIdentity({ subject: identityNew.subject, email: `${slug}-mistmatch@example.com`, name: 'Wrong' }),
      409,
    )

    await expectHttpError(
      loginWithGoogleIdentity({
        subject: `sub-${slug}-rival`,
        email: identityNew.email,
        name: 'Rival',
      }),
      409,
    )

    console.log('Google OAuth account upsert smoke test passed.')
  } finally {
    await deleteUsers()
  }
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeDatabase()
  })