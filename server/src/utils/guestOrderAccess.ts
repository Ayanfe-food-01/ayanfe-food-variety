import { createHash } from 'node:crypto'

export const hashGuestOrderAccessToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')