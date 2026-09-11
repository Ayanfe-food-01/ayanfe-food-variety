import { promisify } from 'node:util'
import {
  createHmac,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto'
import { ShoppingMode, UserRole } from '@prisma/client'
import { env } from '../../config/env.js'
import { ADMIN_SESSION_TTL_MS, CUSTOMER_SESSION_TTL_MS } from './auth.session.constants.js'
import type { AuthenticatedUser } from './auth.types.js'

const scrypt = promisify(nodeScrypt)

const SESSION_COOKIE_NAME = 'ayanfe_admin_session'
const CUSTOMER_SESSION_COOKIE_NAME = 'ayanfe_customer_session'

export const toUser = (user: {
  id: string
  name: string
  email: string
  role: UserRole
  phone?: string | null
  shoppingMode?: ShoppingMode | null
}): AuthenticatedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone ?? null,
  role: user.role,
  shoppingMode: user.shoppingMode ?? ShoppingMode.RETAIL,
})

export const authCookie = {
  name: SESSION_COOKIE_NAME,
  maxAge: ADMIN_SESSION_TTL_MS,
  options: {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: (env.nodeEnv === 'production' ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
  },
}

export const customerAuthCookie = {
  name: CUSTOMER_SESSION_COOKIE_NAME,
  maxAge: CUSTOMER_SESSION_TTL_MS,
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

export const hashSessionToken = (token: string) =>
  createHmac('sha256', env.sessionSecret).update(token).digest('hex')

export const getEmailDomain = (email: string): string =>
  email.split('@')[1]?.toLowerCase() || 'unknown'

export const readAuthCookie = (cookieHeader: string | undefined, name: string): string | null => {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const [key, ...valueParts] = part.trim().split('=')
    if (key !== name) continue
    const value = valueParts.join('=')
    try {
      return decodeURIComponent(value)
    } catch {
      // A malformed cookie must behave like a missing session, not crash the request.
      return null
    }
  }
  return null
}

export const getSessionToken = (cookieHeader: string | undefined) =>
  readAuthCookie(cookieHeader, SESSION_COOKIE_NAME)

export const getCustomerSessionToken = (cookieHeader: string | undefined) =>
  readAuthCookie(cookieHeader, CUSTOMER_SESSION_COOKIE_NAME)