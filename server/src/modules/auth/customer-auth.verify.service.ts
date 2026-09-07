import { UserRole } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import {
  assertVerificationEmailConfigured,
  sendCustomerVerificationEmail,
  VerificationEmailError,
} from './auth.email.js'
import { getEmailDomain, hashPassword, toUser } from './auth.service.js'
import type {
  AuthenticatedUser,
  CustomerEmailVerificationInput,
  CustomerSignupInput,
} from './auth.types.js'
import {
  generateVerificationCode,
  hashVerificationCode,
  isVerificationCodeValid,
  MAX_VERIFICATION_ATTEMPTS,
  verificationResult,
  VERIFICATION_TTL_MS,
} from './customer-auth.otp.js'

const logVerificationEvent = (event: string, email: string, extra?: Record<string, unknown>) => {
  console.info(JSON.stringify({
    event,
    recipientDomain: getEmailDomain(email),
    ...extra,
  }))
}

const getEmailDeliveryError = (error: unknown): HttpError => {
  if (error instanceof VerificationEmailError && error.reason === 'configuration') {
    return new HttpError(
      503,
      'Email verification is not configured on the server. Please contact support.',
    )
  }

  return new HttpError(
    503,
    'We could not send a verification email. Please try again later.',
  )
}

export async function signupCustomer(input: CustomerSignupInput): Promise<{
  user: AuthenticatedUser
  verificationExpiresInSeconds: number
}> {
  try {
    assertVerificationEmailConfigured()
  } catch (error: unknown) {
    logVerificationEvent('email_verification_configuration_failed', input.email)
    throw getEmailDeliveryError(error)
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) throw new HttpError(409, 'An account with this email already exists.')

  const now = new Date()
  const code = generateVerificationCode()
  const passwordHash = await hashPassword(input.password)
  logVerificationEvent('email_verification_requested', input.email)
  const user = await prisma.$transaction(async (transaction) => {
    const createdUser = await transaction.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: UserRole.CUSTOMER,
        emailVerified: false,
      },
    })
    await transaction.customerEmailVerification.create({
      data: {
        userId: createdUser.id,
        otpHash: hashVerificationCode(createdUser.id, code),
        expiresAt: new Date(now.getTime() + VERIFICATION_TTL_MS),
        requestWindowStart: now,
      },
    })
    return createdUser
  })

  try {
    await sendCustomerVerificationEmail({ recipient: user.email, code })
  } catch (error: unknown) {
    try {
      await prisma.$transaction([
        prisma.customerEmailVerification.deleteMany({ where: { userId: user.id } }),
        prisma.user.delete({ where: { id: user.id } }),
      ])
    } catch (cleanupError: unknown) {
      console.error(JSON.stringify({
        event: 'email_verification_signup_cleanup_failed',
        recipientDomain: getEmailDomain(user.email),
        errorName: cleanupError instanceof Error ? cleanupError.name : 'UnknownError',
      }))
    }
    logVerificationEvent('email_verification_delivery_failed', user.email)
    throw getEmailDeliveryError(error)
  }

  logVerificationEvent('email_verification_record_created', user.email)
  return { user: toUser(user), ...verificationResult(user.email) }
}

export async function verifyCustomerEmail(input: CustomerEmailVerificationInput): Promise<{
  email: string
}> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, role: true, emailVerified: true },
  })
  if (!user || user.role !== UserRole.CUSTOMER) {
    throw new HttpError(400, 'The verification code is invalid or has expired.')
  }
  if (user.emailVerified) {
    throw new HttpError(400, 'This email is already verified. You can sign in.')
  }

  const pending = await prisma.customerEmailVerification.findUnique({ where: { userId: user.id } })
  if (!pending) {
    throw new HttpError(400, 'The verification code is invalid or has expired.')
  }

  if (pending.expiresAt <= new Date()) {
    await prisma.customerEmailVerification.deleteMany({ where: { id: pending.id } })
    throw new HttpError(400, 'This verification code has expired. Request a new code.')
  }

  if (pending.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    await prisma.customerEmailVerification.deleteMany({ where: { id: pending.id } })
    throw new HttpError(429, 'Too many incorrect attempts. Request a new code.')
  }

  if (!isVerificationCodeValid(user.id, input.otp, pending.otpHash)) {
    const nextAttempts = pending.attempts + 1
    await prisma.customerEmailVerification.updateMany({
      where: { id: pending.id, attempts: pending.attempts },
      data: { attempts: { increment: 1 } },
    })
    if (nextAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      await prisma.customerEmailVerification.deleteMany({ where: { id: pending.id } })
      throw new HttpError(429, 'Too many incorrect attempts. Request a new code.')
    }
    throw new HttpError(400, 'The verification code is incorrect.')
  }

  await prisma.$transaction(async (transaction) => {
    const updated = await transaction.user.updateMany({
      where: { id: user.id, emailVerified: false },
      data: { emailVerified: true },
    })
    if (updated.count !== 1) {
      throw new HttpError(400, 'This email is already verified. You can sign in.')
    }
    await transaction.customerEmailVerification.deleteMany({ where: { id: pending.id } })
  })

  return { email: user.email }
}