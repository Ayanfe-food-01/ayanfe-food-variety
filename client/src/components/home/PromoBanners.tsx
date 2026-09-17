import { useEffect, useState } from 'react'
import type { PromotionalBanner } from '../../services/storeSettingsService'
import { PromoBannerFade } from './PromoBannerFade'
import { PromoBannerCarousel } from './PromoBannerCarousel'

interface PromoBannersProps {
  banners: PromotionalBanner[]
  isLoading?: boolean
}

const XL_QUERY = '(min-width: 1024px)'

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

function PromoBannersSkeleton({ isXL }: { isXL: boolean }) {
  if (isXL) {
    return (
      <section className="relative my-[30px] flex flex-col items-center" aria-label="Loading promotional offers" aria-busy="true">
        <div className="relative aspect-[2/1] h-auto max-w-full w-[min(var(--container-max-width),calc(100%-48px))] overflow-hidden rounded-[20px] shadow-[0_0_4px_rgb(20_33_22/0.15)]" aria-hidden="true">
          <div className="absolute inset-0 opacity-100">
            <div className="relative h-full w-full animate-promo-shimmer overflow-hidden bg-sage bg-[linear-gradient(90deg,var(--color-line),#eef0e8_50%,var(--color-line))] bg-[length:200%_100%]" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-transparent pb-2 pt-7" aria-label="Loading promotional offers" aria-busy="true">
      <div className="flex snap-x snap-mandatory gap-[14px] overflow-x-auto bg-transparent px-[18px] [scroll-padding-inline:18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-5 md:px-6 md:[scroll-padding-inline:24px] lg:px-[max(24px,calc((100%-1160px)/2))] lg:[scroll-padding-inline:max(24px,calc((100%-1160px)/2))]" aria-hidden="true">
        {Array.from({ length: 2 }, (_, index) => (
          <div className="relative h-[160px] w-[320px] min-w-0 shrink-0 animate-promo-shimmer overflow-hidden rounded-[20px] bg-sage bg-[linear-gradient(90deg,var(--color-line),#eef0e8_50%,var(--color-line))] bg-[length:200%_100%] shadow-[0_0_4px_rgb(20_33_22/0.15)] md:h-[400px] md:w-[800px] lg:aspect-[2/1] lg:h-auto lg:w-[min(var(--container-max-width),100%)]" key={index} />
        ))}
      </div>
    </section>
  )
}

export function PromoBanners({ banners, isLoading = false }: PromoBannersProps) {
  const isXL = useMediaQuery(XL_QUERY)

  if (isLoading) return <PromoBannersSkeleton isXL={isXL} />
  if (banners.length === 0) return null

  return isXL
    ? <PromoBannerFade banners={banners} />
    : <PromoBannerCarousel banners={banners} />
}
