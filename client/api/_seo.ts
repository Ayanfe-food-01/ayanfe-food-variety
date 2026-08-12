/// <reference types="node" />

export interface VercelRequestLike {
  headers: Record<string, string | string[] | undefined>
}

export interface VercelResponseLike {
  setHeader(name: string, value: string | number): VercelResponseLike
  status(code: number): VercelResponseLike
  send(body: string): VercelResponseLike
}

const normalizeUrl = (value: string): string => {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
    throw new Error('The configured public URL must use HTTP or HTTPS.')
  }
  return url.toString().replace(/\/+$/, '')
}

export const getPublicSiteUrl = (request: VercelRequestLike): string => {
  const configuredUrl = process.env.PUBLIC_APP_URL?.trim()
  if (configuredUrl) return normalizeUrl(configuredUrl)

  const forwardedProtocol = request.headers['x-forwarded-proto']
  const forwardedHost = request.headers['x-forwarded-host']
  const protocol = (Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol) || 'https'
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)
    || (Array.isArray(request.headers.host) ? request.headers.host[0] : request.headers.host)
  if (!host) throw new Error('A public site URL is required to generate SEO files.')
  return normalizeUrl(`${protocol.split(',')[0]!.trim()}://${host}`)
}

export const getApiBaseUrl = (): string => {
  const configuredUrl = process.env.VITE_API_URL?.trim()
  if (!configuredUrl) throw new Error('VITE_API_URL is required to generate the sitemap.')
  const url = new URL(configuredUrl)
  url.pathname = url.pathname.replace(/\/+$/, '').endsWith('/api/v1')
    ? url.pathname.replace(/\/+$/, '')
    : `${url.pathname.replace(/\/+$/, '')}/api/v1`
  return url.toString().replace(/\/+$/, '')
}

export const escapeXml = (value: string): string =>
  value.replace(/[<>&'"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  }[character] ?? character))