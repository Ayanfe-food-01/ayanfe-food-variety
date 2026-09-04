import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PromotionalBanner } from '../../services/storeSettingsService'

interface PromoBannersProps {
  banners: PromotionalBanner[]
  isLoading?: boolean
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

export function PromoBanners({ banners, isLoading = false }: PromoBannersProps) {
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
    const target = track.children[index] as HTMLElement | undefined
    if (!target) return
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
    return () => {
      scheduleNextRef.current = () => undefined
    }
  }, [scheduleNext])

  useEffect(() => {
    currentIndexRef.current = 0
    autoScrollingRef.current = false
    centerOn(0, 'auto')
    scheduleNext()

    return () => {
      clearTimers()
      autoScrollingRef.current = false
    }
  }, [banners.length, clearTimers, scheduleNext, centerOn])

  if (isLoading) return <PromoBannersSkeleton />

  if (banners.length === 0) return null

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
        {banners.length > 1 && (
          <div className="promo-dots" role="tablist" aria-label="Choose promotional slide">
            {banners.map((banner, index) => (
              <button
                type="button"
                key={banner.id}
                className={`promo-dot${index === activeIndex ? ' is-active' : ''}`}
                aria-label={`Go to slide ${index + 1}`}
                aria-selected={index === activeIndex}
                role="tab"
                onClick={() => goTo(index)}
              />
            ))}
          </div>
        )}
    </section>
  )
}