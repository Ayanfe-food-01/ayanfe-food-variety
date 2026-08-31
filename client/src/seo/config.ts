export const SITE_NAME = 'Ayanfe Food Variety'
export const HOMEPAGE_TITLE = 'Ayanfe Food Variety | Quality Gluten-Free Foods'
export const BRAND_MESSAGE = 'Quality Gluten-Free Foods, Made for Your Everyday Needs.'
export const DEFAULT_SITE_DESCRIPTION =
  'Shop quality food essentials, carefully selected for your everyday needs, with convenient pickup and delivery options.'
export const ABOUT_TITLE = 'About Ayanfe Food Variety | Gluten-Free Foodstuff'
export const ABOUT_DESCRIPTION =
  `Ayanfe Food Variety offers carefully selected gluten-free foodstuff and pantry essentials for everyday cooking, with convenient online delivery.`
export const CONTACT_TITLE = 'Contact Ayanfe Food Variety'
export const CONTACT_DESCRIPTION =
  'Contact Ayanfe Food Variety for gluten-free foodstuff, pickup information, and delivery support. Find the business contact details and pickup location.'
export const HELP_TITLE = 'Help Centre | Ayanfe Food Variety'
export const HELP_DESCRIPTION =
  'Find answers about ordering and shopping, payment, delivery and pickup, wholesale shopping, order tracking, returns and refunds, and your account at Ayanfe Food Variety.'
export const RETURN_REFUND_TITLE = 'Return & Refund Policy | Ayanfe Food Variety'
export const RETURN_REFUND_DESCRIPTION =
  'Read Ayanfe Food Variety return and refund policy for food and consumable products — eligibility, non-returnable items, and how to report damaged, incorrect or missing products.'
export const PRIVACY_POLICY_TITLE = 'Privacy Policy | Ayanfe Food Variety'
export const PRIVACY_POLICY_DESCRIPTION =
  'Read how Ayanfe Food Variety collects, uses, stores and protects your personal information — including account, order, payment, reviews and cookies, and the third-party services we work with.'
export const TERMS_TITLE = 'Terms & Conditions | Ayanfe Food Variety'
export const TERMS_DESCRIPTION =
  'Read the terms for using Ayanfe Food Variety’s website — including customer accounts, product information, pricing and orders, payments, delivery, returns and refunds, and customer reviews.'
export const SHOP_TITLE = 'Buy Nigerian Foodstuff Online | Ayanfe Food Variety'
export const SHOP_DESCRIPTION =
  'Shop Nigerian foodstuff online, including natural pantry staples, grains, oils and everyday essentials with reliable delivery.'
export const NEW_ARRIVALS_TITLE = 'New Nigerian Foodstuff Arrivals | Ayanfe Food Variety'
export const NEW_ARRIVALS_DESCRIPTION =
  'Discover new Nigerian foodstuff arrivals, from natural pantry staples to everyday groceries, with convenient online delivery.'
export const DEFAULT_LOGO_PATH = '/branding/ayanfe-food-variety-logo.png'
export const DEFAULT_FAVICON_PATH = DEFAULT_LOGO_PATH
export const DEFAULT_SOCIAL_IMAGE_PATH = DEFAULT_LOGO_PATH

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