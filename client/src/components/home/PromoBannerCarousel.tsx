import type { PromotionalBanner } from '../../services/storeSettingsService'
import { useScrollSnapRail } from '../../hooks/useScrollSnapRail'
import { PromoBannerCard } from './PromoBannerCard'
import { PromoDots } from './PromoDots'

interface PromoBannerCarouselProps {
  banners: PromotionalBanner[]
}

export function PromoBannerCarousel({ banners }: PromoBannerCarouselProps) {
  const { trackRef, activeIndex, goTo, interruptAutoAdvance, onScroll } = useScrollSnapRail({
    itemCount: banners.length,
  })

  return (
    <section className="promo-banners-wrap" aria-label="Promotional offers">
      <div
        className="promo-banners-track"
        ref={trackRef}
        onKeyDown={interruptAutoAdvance}
        onPointerDown={interruptAutoAdvance}
        onScroll={onScroll}
        onTouchStart={interruptAutoAdvance}
        onWheel={interruptAutoAdvance}
      >
        {banners.map((banner, index) => (
          <PromoBannerCard banner={banner} index={index} key={banner.id} />
        ))}
      </div>
      <PromoDots
        count={banners.length}
        activeIndex={activeIndex}
        onSelect={(i) => { goTo(i); interruptAutoAdvance() }}
      />
    </section>
  )
}