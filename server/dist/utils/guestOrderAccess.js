import { createHash } from 'node:crypto';
export const hashGuestOrderAccessToken = (token) => createHash('sha256').update(token).digest('hex');
