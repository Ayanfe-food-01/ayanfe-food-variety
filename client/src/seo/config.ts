export const SITE_NAME = 'Ayanfe Food Variety'
export const DEFAULT_SITE_DESCRIPTION =
  'Shop quality Nigerian foodstuff, pantry staples, and everyday groceries from Ayanfe Food Variety. Browse our carefully sourced collection and order for delivery.'
export const DEFAULT_SOCIAL_IMAGE_PATH = '/branding/ayanfe-food-variety-logo.png'

const normalizeSiteUrl = (value: string): string => {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return ''
    return url.toString().replace(/\/+$/, '')
  } catch {
    return ''
  }
}

export const getSiteUrl = (): string => {
  const configuredUrl = normalizeSiteUrl(import.meta.env.PUBLIC_APP_URL ?? '')
  if (configuredUrl) return configuredUrl
  return typeof window === 'undefined' ? '' : window.location.origin
}

export const getAbsoluteUrl = (value: string): string => {
  if (!value) return ''
  try {
    return new URL(value, getSiteUrl() || window.location.origin).toString()
  } catch {
    return value
  }
}