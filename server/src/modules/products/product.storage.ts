import crypto from 'node:crypto'
import { env } from '../../config/env.js'
import { HttpError } from '../../utils/http.js'

const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

const imageTypeFor = (buffer: Buffer): 'jpg' | 'png' | 'webp' | null => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg'
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png'
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  return null
}

const mimeTypeFor = (type: 'jpg' | 'png' | 'webp'): string =>
  type === 'jpg' ? 'image/jpeg' : type === 'png' ? 'image/png' : 'image/webp'

const sha1Signature = (parameters: Record<string, string>): string => {
  const payload = Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  return crypto.createHash('sha1').update(`${payload}${env.cloudinary.apiSecret}`).digest('hex')
}

const publicIdFromProductImageUrl = (imageUrl: string): string | null => {
  try {
    const pathname = new URL(imageUrl).pathname
    const uploadMarker = '/image/upload/'
    const uploadIndex = pathname.indexOf(uploadMarker)
    if (uploadIndex < 0) return null

    const segments = pathname.slice(uploadIndex + uploadMarker.length).split('/').filter(Boolean)
    const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment))
    const publicIdWithExtension = (versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments).join('/')
    if (!publicIdWithExtension.startsWith('product-images/')) return null

    return publicIdWithExtension.replace(/\.(?:jpe?g|png|webp)$/i, '')
  } catch {
    return null
  }
}

export async function uploadProductImage(file: Express.Multer.File): Promise<string> {
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) throw new HttpError(400, 'Product images must be 5 MB or smaller.')
  const detectedType = imageTypeFor(file.buffer)
  if (!detectedType || !allowedMimeTypes.has(file.mimetype) || mimeTypeFor(detectedType) !== file.mimetype) {
    throw new HttpError(400, 'Product image must be a valid JPG, PNG, or WEBP image.')
  }
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    throw new HttpError(503, 'Product image storage is not configured yet.')
  }
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const folder = 'product-images'
  const publicId = crypto.randomUUID()
  const signature = sha1Signature({ folder, public_id: publicId, timestamp })
  const body = new FormData()
  body.append('file', `data:${file.mimetype};base64,${file.buffer.toString('base64')}`)
  body.append('api_key', env.cloudinary.apiKey)
  body.append('timestamp', timestamp)
  body.append('folder', folder)
  body.append('public_id', publicId)
  body.append('signature', signature)
  let response: Response
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.cloudinary.cloudName)}/image/upload`, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(30_000),
    })
  } catch (error: unknown) {
    console.error('Cloudinary product image upload failed', error instanceof Error ? error.message : 'unknown error')
    throw new HttpError(502, 'Product image storage is temporarily unavailable.')
  }
  const result = (await response.json().catch(() => null)) as {
    secure_url?: unknown
    error?: { message?: unknown }
  } | null
  if (!response.ok || typeof result?.secure_url !== 'string') {
    const providerMessage = typeof result?.error?.message === 'string' ? result.error.message : ''
    console.error('Cloudinary rejected product image upload', {
      status: response.status,
      message: providerMessage || 'unknown provider error',
    })
    throw new HttpError(502, 'The product image could not be stored. Check the Cloudinary configuration and try again.')
  }
  return result.secure_url
}

/**
 * Product image cleanup is best effort. Product updates must not fail after
 * the database has been updated just because a remote cleanup request failed.
 */
export async function deleteProductImage(imageUrl: string): Promise<boolean> {
  const publicId = publicIdFromProductImageUrl(imageUrl)
  if (!publicId || !env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) return false

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = sha1Signature({ public_id: publicId, timestamp })
  const body = new FormData()
  body.append('public_id', publicId)
  body.append('api_key', env.cloudinary.apiKey)
  body.append('timestamp', timestamp)
  body.append('signature', signature)

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.cloudinary.cloudName)}/image/destroy`, {
      method: 'POST',
      body,
    })
    const result = (await response.json().catch(() => null)) as { result?: unknown } | null
    return response.ok && (result?.result === 'ok' || result?.result === 'not found')
  } catch {
    return false
  }
}