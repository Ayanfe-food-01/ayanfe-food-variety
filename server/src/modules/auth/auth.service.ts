import { promisify } from 'node:util'
import {
  createHmac,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto'
import { UserRole } from '@prisma/client'
import { env } from '../../config/env.js'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { AuthenticatedUser, LoginInput } from './auth.types.js'
import type { CustomerSignupInput } from './auth.types.js'

const scrypt = promisify(nodeScrypt)
const SESSION_COOKIE_NAME = 'ayanfe_admin_session'
const CUSTOMER_SESSION_COOKIE_NAME = 'ayanfe_customer_session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000

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

export async function signupCustomer(input: CustomerSignupInput): Promise<{ user: AuthenticatedUser; token: string }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) throw new HttpError(409, 'An account with this email already exists.')

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: UserRole.CUSTOMER,
    },
  })
  return createSession(user, 'customer')
}

export async function loginCustomer(input: LoginInput): Promise<{ user: AuthenticatedUser; token: string }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  if (!user || user.role !== UserRole.CUSTOMER || !user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password.')
  }
  return createSession(user, 'customer')
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
