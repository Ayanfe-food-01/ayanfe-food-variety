import { useCallback, useEffect, useRef, useState } from 'react'
import type { PromotionalBanner } from '../../services/storeSettingsService'
import { PromoBannerCard } from './PromoBannerCard'
import { PromoDots } from './PromoDots'

interface PromoBannerCarouselProps {
  banners: PromotionalBanner[]
}

export function PromoBannerCarousel({ banners }: PromoBannerCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const currentIndexRef = useRef(0)
  const autoScrollingRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const autoScrollFinishTimerRef = useRef<number | null>(null)
  const scheduleNextRef = useRef<() => void>(() => undefined)
  const [activeIndex, setActiveIndex] = useState(0)

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    if (autoScrollFinishTimerRef.current !== null) window.clearTimeout(autoScrollFinishTimerRef.current)
    timerRef.current = null
    autoScrollFinishTimerRef.current = null
  }, [])

  const centerOn = useCallback((index: number, behavior: ScrollBehavior) => {
    const track = trackRef.current
    if (!track || track.children.length === 0) return
    const target = track.children[index] as HTMLElement | undefined
    if (!target) return
    const trackRect = track.getBoundingClientRect()
    const targetContentLeft = target.getBoundingClientRect().left - trackRect.left + track.scrollLeft
    track.scrollTo({ left: targetContentLeft + target.offsetWidth / 2 - track.clientWidth / 2, behavior })
  }, [])

  const goTo = useCallback((index: number) => {
    const track = trackRef.current
    if (!track || track.children.length === 0) return
    currentIndexRef.current = index
    setActiveIndex(index)
    autoScrollingRef.current = true
    centerOn(index, 'smooth')
    autoScrollFinishTimerRef.current = window.setTimeout(() => {
      autoScrollingRef.current = false
      scheduleNextRef.current()
    }, 700)
  }, [centerOn])

  const updateCurrentIndex = useCallback(() => {
    const track = trackRef.current
    if (!track || track.children.length === 0) return

    const viewportCenter = track.scrollLeft + track.clientWidth / 2
    const trackLeft = track.getBoundingClientRect().left
    const nearestIndex = Array.from(track.children).reduce(
      (closestIndex, child, index) => {
        const closestChild = track.children[closestIndex] as HTMLElement
        const currentChild = child as HTMLElement
        const distanceFor = (el: HTMLElement) => {
          const elContentLeft = el.getBoundingClientRect().left - trackLeft + track.scrollLeft
          return Math.abs(elContentLeft + el.offsetWidth / 2 - viewportCenter)
        }
        return distanceFor(currentChild) < distanceFor(closestChild) ? index : closestIndex
      },
      0,
    )
    currentIndexRef.current = nearestIndex
    setActiveIndex(nearestIndex)
  }, [])

  const scheduleNext = useCallback(() => {
    clearTimers()
    if (banners.length < 2) return
    timerRef.current = window.setTimeout(() => {
      const track = trackRef.current
      if (!track || track.children.length < 2) return
      goTo((currentIndexRef.current + 1) % track.children.length)
    }, 5000)
  }, [banners.length, clearTimers, goTo])

  useEffect(() => {
    scheduleNextRef.current = scheduleNext
    return () => { scheduleNextRef.current = () => undefined }
  }, [scheduleNext])

  useEffect(() => {
    currentIndexRef.current = 0
    autoScrollingRef.current = false
    centerOn(0, 'auto')
    scheduleNext()
    return () => { clearTimers(); autoScrollingRef.current = false }
  }, [banners.length, clearTimers, scheduleNext, centerOn])

  const interruptAutoAdvance = () => {
    autoScrollingRef.current = false
    if (autoScrollFinishTimerRef.current !== null) {
      window.clearTimeout(autoScrollFinishTimerRef.current)
      autoScrollFinishTimerRef.current = null
    }
    scheduleNext()
  }

  return (
    <section className="promo-banners-wrap" aria-label="Promotional offers">
      <div
        className="promo-banners-track"
        ref={trackRef}
        onKeyDown={interruptAutoAdvance}
        onPointerDown={interruptAutoAdvance}
        onScroll={() => {
          updateCurrentIndex()
          if (!autoScrollingRef.current) scheduleNext()
        }}
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
