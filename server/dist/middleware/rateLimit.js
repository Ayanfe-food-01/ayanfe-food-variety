import { HttpError } from '../utils/http.js';
const buckets = new Map();
export const createRateLimit = (maxRequests, windowMs) => (request, response, next) => {
    const now = Date.now();
    const key = `${request.ip}:${request.path}`;
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        next();
        return;
    }
    if (current.count >= maxRequests) {
        response.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
        next(new HttpError(429, 'Too many requests. Please try again later.'));
        return;
    }
    current.count += 1;
    next();
};
