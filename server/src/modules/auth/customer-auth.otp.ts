import { randomInt, createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '../../config/env.js'

export const VERIFICATION_TTL_MS = 10 * 60 * 1000
export const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000
export const VERIFICATION_RESEND_WINDOW_MS = 24 * 60 * 60 * 1000
export const MAX_VERIFICATION_RESENDS_PER_WINDOW = 5
export const MAX_VERIFICATION_ATTEMPTS = 5

export const generateVerificationCode = (): string =>
  randomInt(0, 1_000_000).toString().padStart(6, '0')

export const hashVerificationCode = (userId: string, code: string): string =>
  createHmac('sha256', env.sessionSecret)
    .update(`${userId}:${code}`)
    .digest('hex')

export const isVerificationCodeValid = (userId: string, code: string, storedHash: string): boolean => {
  if (!/^[0-9a-f]{64}$/i.test(storedHash)) return false
  const expected = Buffer.from(storedHash, 'hex')
  const actual = Buffer.from(hashVerificationCode(userId, code), 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export const verificationResult = (email: string) => ({
  email,
  verificationExpiresInSeconds: VERIFICATION_TTL_MS / 1000,
})