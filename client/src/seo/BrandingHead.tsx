import { useEffect } from 'react'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { DEFAULT_FAVICON_PATH } from './config'

const upsertIconLink = (rel: string, href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.rel = rel
    document.head.appendChild(element)
  }
  element.href = href
  element.removeAttribute('type')
}

const cacheBustedUrl = (url: string): string => {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${encodeURIComponent(url)}`
}

export function BrandingHead() {
  const { settings } = useStoreSettings()

  useEffect(() => {
    const faviconUrl = settings?.faviconUrl ? cacheBustedUrl(settings.faviconUrl) : DEFAULT_FAVICON_PATH
    upsertIconLink('icon', faviconUrl)
    upsertIconLink('shortcut icon', faviconUrl)
    upsertIconLink('apple-touch-icon', faviconUrl)
  }, [settings?.faviconUrl])

  return null
}