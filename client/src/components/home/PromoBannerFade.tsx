import { useCallback, useEffect, useRef, useState } from 'react'
import type { PromotionalBanner } from '../../services/storeSettingsService'
import { PromoBannerCard } from './PromoBannerCard'
import { PromoDots } from './PromoDots'

interface PromoBannerFadeProps {
  banners: PromotionalBanner[]
}

export function PromoBannerFade({ banners }: PromoBannerFadeProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleNext = useCallback(() => {
    clearTimer()
    if (banners.length < 2) return
    timerRef.current = window.setTimeout(() => {
      setActiveIndex(prev => (prev + 1) % banners.length)
    }, 5000)
  }, [banners.length, clearTimer])

  useEffect(() => {
    scheduleNext()
    return clearTimer
  }, [activeIndex, scheduleNext, clearTimer])

  const goTo = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  const interruptAutoAdvance = useCallback(() => {
    clearTimer()
    scheduleNext()
  }, [clearTimer, scheduleNext])

  return (
    <section className="relative my-[30px] flex flex-col items-center" aria-label="Promotional offers">
      <div className="relative aspect-[2/1] h-auto max-w-full w-[min(var(--container-max-width),calc(100%-48px))] overflow-hidden rounded-[20px] shadow-[0_0_4px_rgb(20_33_22/0.15)]">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 pointer-events-none transition-opacity duration-[600ms] ease-in-out${index === activeIndex ? ' pointer-events-auto opacity-100' : ' opacity-0'}`}
            aria-hidden={index !== activeIndex}
          >
            <PromoBannerCard banner={banner} index={index} eager variant="fade" />
          </div>
        ))}
      </div>
      <PromoDots
        count={banners.length}
        activeIndex={activeIndex}
        onSelect={(i) => { goTo(i); interruptAutoAdvance() }}
        variant="fade"
      />
    </section>
  )
}
