import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { HttpError } from '../../utils/http.js';
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const imageTypeFor = (buffer) => {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
        return 'jpg';
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
        return 'png';
    if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP')
        return 'webp';
    if (buffer.length >= 12
        && buffer.toString('ascii', 4, 8) === 'ftyp'
        && ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(buffer.toString('ascii', 8, 12)))
        return 'heic';
    return null;
};
const mimeTypeFor = (type) => type === 'jpg' ? 'image/jpeg' : type === 'png' ? 'image/png' : type === 'webp' ? 'image/webp' : 'image/heic';
const sha1Signature = (parameters) => {
    const payload = Object.entries(parameters)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
    // Cloudinary's signed upload and destroy API requires SHA-1 signatures.
    // This is protocol authentication, not password or data-at-rest hashing.
    return crypto.createHash('sha1').update(`${payload}${env.cloudinary.apiSecret}`).digest('hex');
};
export async function uploadPaymentProof(file, orderId) {
    if (file.size > MAX_RECEIPT_BYTES) {
        throw new HttpError(400, 'Payment receipt must be 5 MB or smaller.');
    }
    const detectedType = imageTypeFor(file.buffer);
    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
    const hasSupportedExtension = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.originalname);
    const normalizedMimeType = file.mimetype === 'image/heif'
        ? 'image/heic'
        : allowedMimeTypes.has(file.mimetype)
            ? file.mimetype
            : hasSupportedExtension
                ? mimeTypeFor(detectedType ?? 'jpg')
                : file.mimetype;
    if (!detectedType || (!allowedMimeTypes.has(file.mimetype) && !hasSupportedExtension) || mimeTypeFor(detectedType) !== normalizedMimeType) {
        throw new HttpError(400, 'Payment receipt must be a valid JPG, PNG, WEBP, or HEIC/HEIF image.');
    }
    if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
        throw new HttpError(503, 'Receipt storage is not configured yet.');
    }
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const publicId = `${orderId}/${crypto.randomUUID()}`;
    const folder = 'payment-receipts';
    const type = 'authenticated';
    const signature = sha1Signature({ folder, public_id: publicId, timestamp, type });
    const body = new FormData();
    body.append('file', `data:${normalizedMimeType};base64,${file.buffer.toString('base64')}`);
    body.append('api_key', env.cloudinary.apiKey);
    body.append('timestamp', timestamp);
    body.append('folder', folder);
    body.append('public_id', publicId);
    body.append('type', type);
    body.append('signature', signature);
    let response;
    try {
        response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.cloudinary.cloudName)}/image/upload`, { method: 'POST', body });
    }
    catch {
        throw new HttpError(502, 'Receipt storage is temporarily unavailable. Please try again.');
    }
    const result = (await response.json().catch(() => null));
    if (!response.ok ||
        typeof result?.secure_url !== 'string' ||
        typeof result.public_id !== 'string') {
        throw new HttpError(502, 'The payment receipt could not be stored. Please try again.');
    }
    return { url: result.secure_url, publicId: result.public_id };
}
export async function deletePaymentProof(publicId) {
    if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret)
        return;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const type = 'authenticated';
    const signature = sha1Signature({ public_id: publicId, timestamp, type });
    const body = new URLSearchParams({
        public_id: publicId,
        api_key: env.cloudinary.apiKey,
        timestamp,
        type,
        signature,
    });
    try {
        await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.cloudinary.cloudName)}/image/destroy`, { method: 'POST', body });
    }
    catch (error) {
        console.error('Payment receipt cleanup failed', error instanceof Error ? error.message : 'unknown error');
    }
}
