import { useEffect } from 'react'
import { DEFAULT_SOCIAL_IMAGE_PATH, getAbsoluteUrl, getSiteUrl, SITE_NAME } from './config'

interface SeoProps {
  title: string
  description: string
  canonicalPath?: string
  image?: string
  imageAlt?: string
  type?: 'website' | 'product'
  noIndex?: boolean
  jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null
}

const upsertMeta = (attribute: 'name' | 'property', key: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.content = content
}

const upsertLink = (rel: string, href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.rel = rel
    document.head.appendChild(element)
  }
  element.href = href
}

export function Seo({
  title,
  description,
  canonicalPath = '/',
  image = DEFAULT_SOCIAL_IMAGE_PATH,
  imageAlt = `${SITE_NAME} logo`,
  type = 'website',
  noIndex = false,
  jsonLd = null,
}: SeoProps) {
  useEffect(() => {
    const siteUrl = getSiteUrl()
    const canonicalUrl = siteUrl ? new URL(canonicalPath, `${siteUrl}/`).toString() : canonicalPath
    const absoluteImageUrl = getAbsoluteUrl(image)
    const robots = noIndex ? 'noindex, nofollow' : 'index, follow'

    document.title = title
    document.documentElement.lang = 'en-NG'
    upsertMeta('name', 'description', description)
    upsertMeta('name', 'robots', robots)
    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('property', 'og:type', type)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', canonicalUrl)
    upsertMeta('property', 'og:locale', 'en_NG')
    upsertMeta('property', 'og:image', absoluteImageUrl)
    upsertMeta('property', 'og:image:alt', imageAlt)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:url', canonicalUrl)
    upsertMeta('name', 'twitter:image', absoluteImageUrl)
    upsertMeta('name', 'twitter:image:alt', imageAlt)
    upsertLink('canonical', canonicalUrl)

    const existingStructuredData = document.head.querySelector('#seo-structured-data')
    existingStructuredData?.remove()
    if (jsonLd) {
      const structuredData = document.createElement('script')
      structuredData.id = 'seo-structured-data'
      structuredData.type = 'application/ld+json'
      structuredData.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(structuredData)
    }
  }, [canonicalPath, description, image, imageAlt, jsonLd, noIndex, title, type])

  return null
}