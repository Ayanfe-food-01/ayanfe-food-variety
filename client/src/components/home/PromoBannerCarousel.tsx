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
    <section className="bg-transparent pb-2 pt-7" aria-label="Promotional offers">
      <div
        className="flex snap-x snap-mandatory gap-[14px] overflow-x-auto bg-transparent px-[18px] [scroll-padding-inline:18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-5 md:px-6 md:[scroll-padding-inline:24px] lg:px-[max(24px,calc((100%-1160px)/2))] lg:[scroll-padding-inline:max(24px,calc((100%-1160px)/2))]"
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