import { Link } from 'react-router-dom'
import type { PromotionalBanner } from '../../services/storeSettingsService'

const destinationFor = (destination: string | null): string | null => {
  if (!destination || !destination.startsWith('/') || destination.startsWith('//')) return null
  return destination
}

interface PromoBannerCardProps {
  banner: PromotionalBanner
  index: number
  eager?: boolean
}

export function PromoBannerCard({ banner, index, eager }: PromoBannerCardProps) {
  const destination = destinationFor(banner.destination)
  const content = (
    <>
      <img
        className="promo-banner-image"
        src={banner.imageUrl}
        alt={banner.title}
        loading={eager || index === 0 ? 'eager' : 'lazy'}
        fetchPriority={index === 0 ? 'high' : 'auto'}
      />
      {(banner.promotionalText || banner.buttonText) && (
        <div className="promo-banner-content">
          {banner.promotionalText && <p>{banner.promotionalText}</p>}
          {banner.buttonText && <span>{banner.buttonText} <span aria-hidden="true">→</span></span>}
        </div>
      )}
    </>
  )

  return (
    <article className="promo-banner-card">
      {destination ? (
        <Link
          to={destination}
          aria-label={`${banner.title}${banner.buttonText ? `: ${banner.buttonText}` : ''}`}
        >
          {content}
        </Link>
      ) : content}
    </article>
  )
}
