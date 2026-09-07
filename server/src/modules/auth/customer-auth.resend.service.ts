import { UserRole } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { sendCustomerVerificationEmail } from './auth.email.js'
import { getEmailDomain } from './auth.service.js'
import type { CustomerVerificationEmailInput } from './auth.types.js'
import {
  generateVerificationCode,
  hashVerificationCode,
  MAX_VERIFICATION_RESENDS_PER_WINDOW,
  verificationResult,
  VERIFICATION_RESEND_COOLDOWN_MS,
  VERIFICATION_RESEND_WINDOW_MS,
  VERIFICATION_TTL_MS,
} from './customer-auth.otp.js'

const logVerificationEvent = (event: string, email: string, extra?: Record<string, unknown>) => {
  console.info(JSON.stringify({
    event,
    recipientDomain: getEmailDomain(email),
    ...extra,
  }))
}

const getEmailDeliveryError = (error: unknown): HttpError =>
  new HttpError(503, 'We could not send a verification email. Please try again later.')

export async function resendCustomerVerificationEmail(input: CustomerVerificationEmailInput): Promise<{
  email: string
  verificationExpiresInSeconds: number
}> {
  const genericResult = {
    email: input.email,
    verificationExpiresInSeconds: VERIFICATION_TTL_MS / 1000,
  }
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, role: true, emailVerified: true },
  })

  if (!user || user.role !== UserRole.CUSTOMER || user.emailVerified) {
    return genericResult
  }

  const now = new Date()
  const pending = await prisma.customerEmailVerification.findUnique({ where: { userId: user.id } })
  if (pending && now.getTime() - pending.createdAt.getTime() < VERIFICATION_RESEND_COOLDOWN_MS) {
    throw new HttpError(429, 'Please wait before requesting another verification code.')
  }

  const requestWindowIsActive =
    pending && now.getTime() - pending.requestWindowStart.getTime() < VERIFICATION_RESEND_WINDOW_MS
  if (requestWindowIsActive && pending.requestCount >= MAX_VERIFICATION_RESENDS_PER_WINDOW) {
    throw new HttpError(429, 'Too many verification emails requested. Please try again later.')
  }

  const code = generateVerificationCode()
  const requestWindowStart = requestWindowIsActive ? pending.requestWindowStart : now
  const requestCount = requestWindowIsActive ? (pending?.requestCount ?? 0) + 1 : 1
  const replacement = {
    otpHash: hashVerificationCode(user.id, code),
    expiresAt: new Date(now.getTime() + VERIFICATION_TTL_MS),
    attempts: 0,
    requestCount,
    requestWindowStart,
    createdAt: now,
  }
  const saved = await prisma.customerEmailVerification.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...replacement },
    update: replacement,
  })

  try {
    await sendCustomerVerificationEmail({ recipient: user.email, code })
  } catch (error: unknown) {
    try {
      if (pending) {
        await prisma.customerEmailVerification.updateMany({
          where: { id: saved.id, createdAt: now },
          data: {
            otpHash: pending.otpHash,
            expiresAt: pending.expiresAt,
            attempts: pending.attempts,
            requestCount: pending.requestCount,
            requestWindowStart: pending.requestWindowStart,
            createdAt: pending.createdAt,
          },
        })
      } else {
        await prisma.customerEmailVerification.deleteMany({
          where: { id: saved.id, createdAt: now },
        })
      }
    } catch (rollbackError: unknown) {
      console.error(JSON.stringify({
        event: 'email_verification_resend_rollback_failed',
        recipientDomain: getEmailDomain(user.email),
        errorName: rollbackError instanceof Error ? rollbackError.name : 'UnknownError',
      }))
    }
    logVerificationEvent('email_verification_resend_failed', user.email)
    throw getEmailDeliveryError(error)
  }

  logVerificationEvent('email_verification_resend_sent', user.email)
  return { ...verificationResult(user.email), email: user.email }
}