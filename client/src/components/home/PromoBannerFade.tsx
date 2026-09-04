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
    <section className="promo-fade-wrap" aria-label="Promotional offers">
      <div className="promo-fade-track">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`promo-fade-slide${index === activeIndex ? ' is-active' : ''}`}
            aria-hidden={index !== activeIndex}
          >
            <PromoBannerCard banner={banner} index={index} eager />
          </div>
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
