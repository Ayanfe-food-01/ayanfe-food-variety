import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { HttpError } from '../utils/http.js'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

export type CloudinaryImageType = 'jpg' | 'png' | 'webp' | 'heic'

const imageTypeFor = (buffer: Buffer): CloudinaryImageType | null => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg'
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png'
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  if (
    buffer.length >= 12
    && buffer.toString('ascii', 4, 8) === 'ftyp'
    && ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(buffer.toString('ascii', 8, 12))
  ) return 'heic'
  return null
}

const mimeTypeFor = (type: CloudinaryImageType): string =>
  type === 'jpg' ? 'image/jpeg' : type === 'png' ? 'image/png' : type === 'webp' ? 'image/webp' : 'image/heic'

const isStartOfFrameMarker = (marker: number): boolean =>
  (marker >= 0xc0 && marker <= 0xc3)
  || (marker >= 0xc5 && marker <= 0xc7)
  || (marker >= 0xc9 && marker <= 0xcb)
  || (marker >= 0xcd && marker <= 0xcf)

const jpegDimensionsFor = (buffer: Buffer): { width: number; height: number } | null => {
  let offset = 2
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1
    const marker = buffer[offset]
    offset += 1
    if (marker === undefined) return null
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (offset + 2 > buffer.length) return null
    const segmentLength = buffer.readUInt16BE(offset)
    if (segmentLength < 2 || offset + segmentLength > buffer.length) return null
    if (isStartOfFrameMarker(marker) && offset + 7 <= buffer.length) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      }
    }
    offset += segmentLength
  }
  return null
}

const webpDimensionsFor = (buffer: Buffer): { width: number; height: number } | null => {
  const byteAt = (index: number): number => buffer[index] ?? 0
  let offset = 12
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString('ascii', offset, offset + 4)
    const chunkLength = buffer.readUInt32LE(offset + 4)
    const dataOffset = offset + 8
    if (dataOffset + chunkLength > buffer.length) return null
    if (chunkType === 'VP8X' && chunkLength >= 10) {
      return {
        width: 1 + byteAt(dataOffset + 4) + (byteAt(dataOffset + 5) << 8) + (byteAt(dataOffset + 6) << 16),
        height: 1 + byteAt(dataOffset + 7) + (byteAt(dataOffset + 8) << 8) + (byteAt(dataOffset + 9) << 16),
      }
    }
    if (chunkType === 'VP8 ' && chunkLength >= 12 && buffer[dataOffset + 6] === 0x9d && buffer[dataOffset + 7] === 0x01 && buffer[dataOffset + 8] === 0x2a) {
      return {
        width: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
        height: buffer.readUInt16LE(dataOffset + 10) & 0x3fff,
      }
    }
    if (chunkType === 'VP8L' && chunkLength >= 5 && buffer[dataOffset] === 0x2f) {
      const bits = (
        byteAt(dataOffset + 1)
        | (byteAt(dataOffset + 2) << 8)
        | (byteAt(dataOffset + 3) << 16)
        | (byteAt(dataOffset + 4) << 24)
      ) >>> 0
      return {
        width: 1 + (bits & 0x3fff),
        height: 1 + ((bits >>> 14) & 0x3fff),
      }
    }
    offset += 8 + chunkLength + (chunkLength % 2)
  }
  return null
}

const dimensionsFor = (buffer: Buffer, type: CloudinaryImageType): { width: number; height: number } | null => {
  if (type === 'png' && buffer.length >= 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  }
  if (type === 'jpg') return jpegDimensionsFor(buffer)
  if (type === 'webp') return webpDimensionsFor(buffer)
  return null
}

const sha1Signature = (parameters: Record<string, string>): string => {
  const payload = Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  return crypto.createHash('sha1').update(`${payload}${env.cloudinary.apiSecret}`).digest('hex')
}

export interface CloudinaryImage {
  url: string
  publicId: string
}

export async function uploadCloudinaryImage(
  file: Express.Multer.File,
  options: {
    folder: string
    label: string
    allowedTypes?: readonly CloudinaryImageType[]
    requireSquare?: boolean
  },
): Promise<CloudinaryImage> {
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError(400, `${options.label} images must be 5 MB or smaller.`)

  const detectedType = imageTypeFor(file.buffer)
  const allowedTypes = new Set(options.allowedTypes ?? ['jpg', 'png', 'webp', 'heic'])
  const hasSupportedExtension = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.originalname)
  const normalizedMimeType = file.mimetype === 'image/heif'
    ? 'image/heic'
    : allowedMimeTypes.has(file.mimetype)
      ? file.mimetype
      : hasSupportedExtension
        ? mimeTypeFor(detectedType ?? 'jpg')
        : file.mimetype
  if (!detectedType || !allowedTypes.has(detectedType) || (!allowedMimeTypes.has(file.mimetype) && !hasSupportedExtension) || mimeTypeFor(detectedType) !== normalizedMimeType) {
    throw new HttpError(400, `${options.label} image must be a valid JPG, PNG, WEBP, or HEIC/HEIF image.`)
  }
  if (options.requireSquare) {
    const dimensions = dimensionsFor(file.buffer, detectedType)
    if (!dimensions || dimensions.width !== dimensions.height) {
      throw new HttpError(400, `${options.label} images must be square and use a supported browser image format.`)
    }
  }
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    throw new HttpError(503, `${options.label} image storage is not configured yet.`)
  }

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const publicId = crypto.randomUUID()
  const signature = sha1Signature({ folder: options.folder, public_id: publicId, timestamp })
  const body = new FormData()
  body.append('file', `data:${normalizedMimeType};base64,${file.buffer.toString('base64')}`)
  body.append('api_key', env.cloudinary.apiKey)
  body.append('timestamp', timestamp)
  body.append('folder', options.folder)
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
    console.error(`Cloudinary ${options.label.toLowerCase()} image upload failed`, error instanceof Error ? error.message : 'unknown error')
    throw new HttpError(502, `${options.label} image storage is temporarily unavailable.`)
  }

  const result = (await response.json().catch(() => null)) as {
    secure_url?: unknown
    public_id?: unknown
    error?: { message?: unknown }
  } | null
  if (!response.ok || typeof result?.secure_url !== 'string' || typeof result.public_id !== 'string') {
    const providerMessage = typeof result?.error?.message === 'string' ? result.error.message : ''
    console.error(`Cloudinary rejected ${options.label.toLowerCase()} image`, {
      status: response.status,
      message: providerMessage || 'unknown provider error',
    })
    throw new HttpError(502, `The ${options.label.toLowerCase()} image could not be stored. Check the Cloudinary configuration and try again.`)
  }

  return { url: result.secure_url, publicId: result.public_id }
}

export function publicIdFromCloudinaryUrl(imageUrl: string, folder: string): string | null {
  try {
    const pathname = new URL(imageUrl).pathname
    const uploadMarker = '/image/upload/'
    const uploadIndex = pathname.indexOf(uploadMarker)
    if (uploadIndex < 0) return null

    const segments = pathname.slice(uploadIndex + uploadMarker.length).split('/').filter(Boolean)
    const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment))
    const publicIdWithExtension = (versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments).join('/')
    if (!publicIdWithExtension.startsWith(`${folder}/`)) return null
    return publicIdWithExtension.replace(/\.(?:jpe?g|png|webp|heic|heif)$/i, '')
  } catch {
    return null
  }
}

export async function deleteCloudinaryImage(publicId: string | null | undefined): Promise<boolean> {
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
      signal: AbortSignal.timeout(30_000),
    })
    const result = (await response.json().catch(() => null)) as { result?: unknown } | null
    return response.ok && (result?.result === 'ok' || result?.result === 'not found')
  } catch {
    return false
  }
}