export const SITE_NAME = 'Ayanfe Food Variety'
export const HOMEPAGE_TITLE = 'Ayanfe Food Variety | Buy Nigerian Foodstuff Online'
export const BRAND_MESSAGE = 'Quality Nigerian Foodstuff, Delivered to Your Doorstep.'
export const DEFAULT_SITE_DESCRIPTION =
  `${BRAND_MESSAGE} Shop swallow flours, grains, oils and more.`
export const ABOUT_TITLE = 'About Ayanfe Food Variety | Nigerian Foodstuff'
export const ABOUT_DESCRIPTION =
  `Ayanfe Food Variety brings quality, natural Nigerian foodstuff to your kitchen with reliable online delivery.`
export const SHOP_TITLE = 'Buy Nigerian Foodstuff Online | Ayanfe Food Variety'
export const SHOP_DESCRIPTION =
  'Shop Nigerian foodstuff online, including natural pantry staples, grains, oils and everyday essentials with reliable delivery.'
export const NEW_ARRIVALS_TITLE = 'New Nigerian Foodstuff Arrivals | Ayanfe Food Variety'
export const NEW_ARRIVALS_DESCRIPTION =
  'Discover new Nigerian foodstuff arrivals, from natural pantry staples to everyday groceries, with convenient online delivery.'
export const DEFAULT_SOCIAL_IMAGE_PATH = '/branding/ayanfe-food-variety-logo.png'

export const fitMetaText = (value: string, maximumLength: number): string => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maximumLength) return normalized
  const shortened = normalized.slice(0, maximumLength - 1).replace(/\s+\S*$/, '').trim()
  return `${shortened}…`
}

export const getProductTitle = (productName: string): string =>
  fitMetaText(`${productName} | ${SITE_NAME}`, 60)

export const getProductMetaDescription = (productName: string): string =>
  fitMetaText(`Buy ${productName} online. 100% natural, preservative-free Nigerian foodstuff with nationwide delivery.`, 155)

export const getCategoryTitle = (categoryName: string): string =>
  fitMetaText(`${categoryName} | Nigerian Foodstuff | ${SITE_NAME}`, 60)

export const getCategoryMetaDescription = (categoryName: string, categoryDescription?: string): string =>
  fitMetaText(
    `Explore ${categoryName} at Ayanfe Food Variety. ${BRAND_MESSAGE} ${categoryDescription ?? ''}`,
    155,
  )

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

export const getOrganizationSchema = (): Record<string, unknown> => {
  const siteUrl = getSiteUrl()
  const organizationId = `${siteUrl}/#organization`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: SITE_NAME,
        url: siteUrl,
        logo: getAbsoluteUrl(DEFAULT_SOCIAL_IMAGE_PATH),
        description: DEFAULT_SITE_DESCRIPTION,
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: SITE_NAME,
        url: siteUrl,
        inLanguage: 'en-NG',
        publisher: { '@id': organizationId },
      },
    ],
  }
}

export const getBreadcrumbSchema = (items: Array<{ name: string; path: string }>): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: getAbsoluteUrl(item.path),
  })),
})