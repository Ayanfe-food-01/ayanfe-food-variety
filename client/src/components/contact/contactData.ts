import type { ComponentType } from 'react'
import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon, WhatsAppIcon } from '../../assets/icons'
import type { StoreSettings } from '../../services/storeSettingsService'

export interface ContactCardItem {
  id: string
  icon: ComponentType<{ size?: number; className?: string }>
  eyebrow: string
  value: string
  href?: string
  external?: boolean
  actionLabel?: string
}

export const displayValue = (value: string | undefined, fallback: string): string =>
  value?.trim() || fallback

/**
 * Builds the WhatsApp deep-link from a stored Nigerian number (leading 0 is
 * replaced with the country code).
 */
export const buildWhatsAppHref = (whatsapp: string | undefined): string | undefined =>
  whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '').replace(/^0/, '234')}` : undefined

/** Turns store settings into the ordered contact info card list. */
export const buildContactCards = (settings: StoreSettings | null, isLoading: boolean): ContactCardItem[] => {
  const loading = isLoading ? 'Loading…' : 'Not published yet.'
  const cards: ContactCardItem[] = []

  const phone = settings?.businessPhone?.trim()
  if (phone) {
    cards.push({
      id: 'phone',
      icon: PhoneIcon,
      eyebrow: 'Call us',
      value: phone,
      href: `tel:${phone}`,
      actionLabel: 'Call now',
    })
  }

  const email = settings?.businessEmail?.trim()
  if (email) {
    cards.push({
      id: 'email',
      icon: MailIcon,
      eyebrow: 'Write to us',
      value: email,
      href: `mailto:${email}`,
      actionLabel: 'Send email',
    })
  }

  const whatsappHref = buildWhatsAppHref(settings?.whatsappNumber)
  if (whatsappHref) {
    cards.push({
      id: 'whatsapp',
      icon: WhatsAppIcon,
      eyebrow: 'Chat with us',
      value: 'WhatsApp',
      href: whatsappHref,
      external: true,
      actionLabel: 'Open chat',
    })
  }

  cards.push({
    id: 'address',
    icon: MapPinIcon,
    eyebrow: 'Visit us',
    value: displayValue(settings?.address, loading),
  })

  cards.push({
    id: 'hours',
    icon: ClockIcon,
    eyebrow: 'Opening hours',
    value: displayValue(settings?.openingHours, loading),
  })

  return cards
}