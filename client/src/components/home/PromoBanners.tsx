import { Link } from 'react-router-dom'
import type { PromotionalBanner } from '../../services/storeSettingsService'

interface PromoBannersProps {
  banners: PromotionalBanner[]
}

const destinationFor = (destination: string | null): string | null => {
  if (!destination || !destination.startsWith('/') || destination.startsWith('//')) return null
  return destination
}

function PromoBannerCard({ banner, index }: { banner: PromotionalBanner; index: number }) {
  const destination = destinationFor(banner.destination)
  const content = (
    <>
      <img
        className="promo-banner-image"
        src={banner.imageUrl}
        alt={banner.title}
        loading={index === 0 ? 'eager' : 'lazy'}
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

export function PromoBanners({ banners }: PromoBannersProps) {
  if (banners.length === 0) return null

  return (
    <section className="promo-banners-wrap" aria-label="Promotional offers">
      <div className="container">
        <div className="promo-banners-track">
          {banners.map((banner, index) => (
            <PromoBannerCard banner={banner} index={index} key={banner.id} />
          ))}
        </div>
      </div>
    </section>
  )
}