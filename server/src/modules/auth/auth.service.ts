import { promisify } from 'node:util'
import {
  createHmac,
  randomBytes,
  randomInt,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto'
import { UserRole } from '@prisma/client'
import { env } from '../../config/env.js'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import {
  assertVerificationEmailConfigured,
  sendCustomerVerificationEmail,
  VerificationEmailError,
} from './auth.email.js'
import type {
  AuthenticatedUser,
  CustomerEmailVerificationInput,
  CustomerSignupInput,
  CustomerVerificationEmailInput,
  LoginInput,
} from './auth.types.js'

const scrypt = promisify(nodeScrypt)
const SESSION_COOKIE_NAME = 'ayanfe_admin_session'
const CUSTOMER_SESSION_COOKIE_NAME = 'ayanfe_customer_session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const VERIFICATION_TTL_MS = 10 * 60 * 1000
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000
const VERIFICATION_RESEND_WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_VERIFICATION_RESENDS_PER_WINDOW = 5
const MAX_VERIFICATION_ATTEMPTS = 5

const toUser = (user: {
  id: string
  name: string
  email: string
  role: UserRole
  phone?: string | null
}): AuthenticatedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone ?? null,
  role: user.role,
})

export const authCookie = {
  name: SESSION_COOKIE_NAME,
  maxAge: SESSION_TTL_MS,
  options: {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: (env.nodeEnv === 'production' ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
  },
}

export const customerAuthCookie = {
  name: CUSTOMER_SESSION_COOKIE_NAME,
  maxAge: SESSION_TTL_MS,
  options: {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: (env.nodeEnv === 'production' ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
  },
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer
  return `scrypt$1$${salt}$${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, version, salt, keyHex] = storedHash.split('$')
  if (algorithm !== 'scrypt' || version !== '1' || !salt || !keyHex || !/^[0-9a-f]+$/i.test(keyHex)) {
    return false
  }
  const expectedKey = Buffer.from(keyHex, 'hex')
  const actualKey = (await scrypt(password, salt, expectedKey.length)) as Buffer
  return expectedKey.length === actualKey.length && timingSafeEqual(expectedKey, actualKey)
}

const hashSessionToken = (token: string) =>
  createHmac('sha256', env.sessionSecret).update(token).digest('hex')

const generateVerificationCode = (): string =>
  randomInt(0, 1_000_000).toString().padStart(6, '0')

const hashVerificationCode = (userId: string, code: string): string =>
  createHmac('sha256', env.sessionSecret)
    .update(`${userId}:${code}`)
    .digest('hex')

const isVerificationCodeValid = (userId: string, code: string, storedHash: string): boolean => {
  if (!/^[0-9a-f]{64}$/i.test(storedHash)) return false
  const expected = Buffer.from(storedHash, 'hex')
  const actual = Buffer.from(hashVerificationCode(userId, code), 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

const verificationResult = (email: string) => ({
  email,
  verificationExpiresInSeconds: VERIFICATION_TTL_MS / 1000,
})

const getEmailDomain = (email: string): string =>
  email.split('@')[1]?.toLowerCase() || 'unknown'

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

const readCookie = (cookieHeader: string | undefined, name: string): string | null => {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const [key, ...valueParts] = part.trim().split('=')
    if (key === name) return decodeURIComponent(valueParts.join('='))
  }
  return null
}

export const getSessionToken = (cookieHeader: string | undefined) =>
  readCookie(cookieHeader, SESSION_COOKIE_NAME)

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

async function createSession(user: {
  id: string
  name: string
  email: string
  role: UserRole
}, kind: SessionKind): Promise<{ user: AuthenticatedUser; token: string }> {
  const token = randomBytes(32).toString('base64url')
  const sessionData = {
    userId: user.id,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
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
  return { ...genericResult, email: user.email }
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

export const getCustomerSessionToken = (cookieHeader: string | undefined) =>
  readCookie(cookieHeader, CUSTOMER_SESSION_COOKIE_NAME)

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

export const isGoogleOAuthConfigured = Boolean(
  env.googleOAuth.clientId && env.googleOAuth.clientSecret && env.googleOAuth.redirectUri,
)

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
