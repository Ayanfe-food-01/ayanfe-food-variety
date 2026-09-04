import { useEffect, useState } from 'react'
import type { PromotionalBanner } from '../../services/storeSettingsService'
import { PromoBannerFade } from './PromoBannerFade'
import { PromoBannerCarousel } from './PromoBannerCarousel'

interface PromoBannersProps {
  banners: PromotionalBanner[]
  isLoading?: boolean
}

const XL_QUERY = '(min-width: 1600px)'

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

function PromoBannersSkeleton() {
  return (
    <section className="promo-banners-wrap" aria-label="Loading promotional offers" aria-busy="true">
      <div className="promo-banners-track" aria-hidden="true">
        {Array.from({ length: 2 }, (_, index) => (
          <div className="promo-banner-card promo-banner-skeleton" key={index} />
        ))}
      </div>
    </section>
  )
}

export function PromoBanners({ banners, isLoading = false }: PromoBannersProps) {
  const isXL = useMediaQuery(XL_QUERY)

  if (isLoading) return <PromoBannersSkeleton />
  if (banners.length === 0) return null

  return isXL
    ? <PromoBannerFade banners={banners} />
    : <PromoBannerCarousel banners={banners} />
}
