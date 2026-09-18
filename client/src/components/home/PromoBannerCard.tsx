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
  variant?: 'rail' | 'fade'
}

export function PromoBannerCard({ banner, index, eager, variant = 'rail' }: PromoBannerCardProps) {
  const destination = destinationFor(banner.destination)
  const cardClass = variant === 'fade'
    ? 'relative h-full w-full overflow-hidden bg-sage'
    : 'relative h-[160px] w-[320px] min-w-0 shrink-0 snap-center snap-always overflow-hidden rounded-[20px] bg-sage shadow-[0_0_4px_rgb(20_33_22/0.15)] md:h-[400px] md:w-[800px] lg:aspect-[2/1] lg:h-auto lg:w-[min(var(--container-max-width),100%)]'
  const content = (
    <>
      <img
        className="size-full bg-sage object-cover object-left"
        src={banner.imageUrl}
        alt={banner.title}
        loading={eager || index === 0 ? 'eager' : 'lazy'}
        fetchPriority={index === 0 ? 'high' : 'auto'}
      />
      {(banner.promotionalText || banner.buttonText) && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-[linear-gradient(transparent,color-mix(in_srgb,var(--color-sage)_92%,transparent))] px-4 py-3 text-green md:px-[22px] md:py-[18px]">
          {banner.promotionalText && <p className="m-0 text-[12px] font-bold md:text-[clamp(13px,1.6vw,18px)]">{banner.promotionalText}</p>}
          {banner.buttonText && <span className="whitespace-nowrap rounded-full bg-orange px-[10px] py-[6px] text-[9px] font-extrabold md:px-4 md:py-[9px] md:text-[clamp(11px,1.2vw,13px)]">{banner.buttonText} <span aria-hidden="true">→</span></span>}
        </div>
      )}
    </>
  )

  return (
    <article className={cardClass}>
      {destination ? (
        <Link
          to={destination}
          className="block h-full bg-sage focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-orange"
          aria-label={`${banner.title}${banner.buttonText ? `: ${banner.buttonText}` : ''}`}
        >
          {content}
        </Link>
      ) : content}
    </article>
  )
}